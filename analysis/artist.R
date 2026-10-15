library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 2) {
  stop("CSV file path and selected artist are required.")
}

file_path <- args[1]
selected_artist <- args[2]

opponent_artist <- if (length(args) >= 3) {
  args[3]
} else {
  NULL
}

if (!is.null(opponent_artist) && selected_artist == opponent_artist) {
  stop("Please select two different artists.")
}

data <- read.csv(file_path, stringsAsFactors = FALSE)

# "skipped" is intentionally not required: skip rate is calculated from
# reason_end when available, with "skipped" used only as a fallback.
required_columns <- c(
  "ts",
  "ms_played",
  "master_metadata_track_name",
  "master_metadata_album_artist_name",
  "master_metadata_album_album_name"
)

missing_columns <- setdiff(required_columns, names(data))

if (length(missing_columns) > 0) {
  stop(
    paste(
      "Missing required CSV columns:",
      paste(missing_columns, collapse = ", ")
    )
  )
}

if (!("reason_end" %in% names(data)) && !("skipped" %in% names(data))) {
  stop("CSV needs either a reason_end or skipped column to calculate skip rate.")
}

# Skip rate helper
#
# Spotify's "skipped" column is often FALSE or empty for nearly every row
# in the extended streaming history, which produces a skip rate of 0.
# reason_end records how each play actually ended, so it is preferred.
# A play counts as a skip when the user pressed the forward button.
# If reason_end is unavailable or empty, fall back to "skipped".

calc_skip_rate <- function(df) {

  if ("reason_end" %in% names(df)) {

    reason <- tolower(trimws(as.character(df$reason_end)))

    known <- !is.na(reason) & reason != "" & reason != "na"

    if (sum(known) > 0) {
      return(mean(reason[known] == "fwdbtn") * 100)
    }
  }

  if ("skipped" %in% names(df)) {

    skipped <- tolower(trimws(as.character(df$skipped)))

    valid <- !is.na(df$skipped) &
      skipped %in% c("true", "false", "1", "0")

    if (sum(valid) > 0) {
      return(mean(skipped[valid] %in% c("true", "1")) * 100)
    }
  }

  NA_real_
}

# Select listening records for the chosen artist

artist_data <- data[
  !is.na(data$master_metadata_album_artist_name) &
    data$master_metadata_album_artist_name == selected_artist,
]

if (nrow(artist_data) == 0) {
  stop("No listening history found for the selected artist.")
}

# Total listening time across all artists

total_ms <- sum(data$ms_played, na.rm = TRUE)
total_hours <- total_ms / 3600000

# Total plays across all artists

valid_tracks <- !is.na(data$master_metadata_track_name) &
  data$master_metadata_track_name != ""

total_plays <- sum(valid_tracks)

# Average listening time per recorded track play

avg_ms <- if (total_plays > 0) {
  total_ms / total_plays
} else {
  0
}

avg_seconds <- avg_ms / 1000

# Favourite song across all artists

song_counts <- sort(
  table(data$master_metadata_track_name[valid_tracks]),
  #counts the frequency of unique values.
  decreasing = TRUE
)

fav_song <- if (length(song_counts) > 0) {
  names(song_counts)[1]
} else {
  "Unknown"
}

# Favourite album across all artists

valid_albums <- !is.na(data$master_metadata_album_album_name) &
  data$master_metadata_album_album_name != ""

album_counts <- sort(
  table(data$master_metadata_album_album_name[valid_albums]),
  decreasing = TRUE
)

fav_album <- if (length(album_counts) > 0) {
  names(album_counts)[1]
} else {
  "Unknown"
}

# Skip rate across all artists

skip_rate <- calc_skip_rate(data)

# Parse timestamps

data$timestamp <- as.POSIXct(
  data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

# Convert timestamps to Indian local time for grouping

data$month <- format(
  data$timestamp,
  "%Y-%m",
  tz = "Asia/Kolkata"
)

# Monthly listening hours across all artists

valid_months <- !is.na(data$timestamp)

monthly_ms <- aggregate(
  ms_played ~ month,
  data = data[valid_months, ],
  FUN = function(x) sum(x, na.rm = TRUE)
)

monthly_ms$hours <- round(
  monthly_ms$ms_played / 3600000,
  2
)

monthly_listening <- as.list(
  setNames(monthly_ms$hours, monthly_ms$month)
)

# Plays by time of day across all artists

data$hour <- as.integer(
  format(
    data$timestamp,
    "%H",
    tz = "Asia/Kolkata"
  )
)

data$time_of_day <- cut(
  data$hour,
  breaks = c(-1, 5, 11, 16, 20, 23),
  labels = c(
    "Night",
    "Morning",
    "Afternoon",
    "Evening",
    "Late Evening"
  )
)

plays_by_time <- table(
  data$time_of_day,
  useNA = "no"
)

# Selected artist listening time

artist_ms <- sum(artist_data$ms_played, na.rm = TRUE)
artist_hours <- artist_ms / 3600000

# Selected artist play count

artist_valid_tracks <- !is.na(artist_data$master_metadata_track_name) &
  artist_data$master_metadata_track_name != ""

artist_plays <- sum(artist_valid_tracks)

# Selected artist's most-played song

artist_song_counts <- sort(
  table(
    artist_data$master_metadata_track_name[
      artist_valid_tracks
    ]
  ),
  decreasing = TRUE
)

artist_favourite_song <- if (length(artist_song_counts) > 0) {
  names(artist_song_counts)[1]
} else {
  "Unknown"
}

# Selected artist's most-played album

artist_valid_albums <- !is.na(artist_data$master_metadata_album_album_name) &
  artist_data$master_metadata_album_album_name != ""

artist_album_counts <- sort(
  table(
    artist_data$master_metadata_album_album_name[
      artist_valid_albums
    ]
  ),
  decreasing = TRUE
)

artist_favourite_album <- if (length(artist_album_counts) > 0) {
  names(artist_album_counts)[1]
} else {
  "Unknown"
}

# Artist loyalty: share of total listening time spent on this artist

artist_loyalty <- if (total_ms > 0) {
  artist_ms / total_ms * 100
} else {
  0
}

# Selected artist skip rate

artist_skip_rate <- calc_skip_rate(artist_data)

# Selected artist listening by month

artist_data$timestamp <- as.POSIXct(
  artist_data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

artist_data$month <- format(
  artist_data$timestamp,
  "%Y-%m",
  tz = "Asia/Kolkata"
)

artist_valid_months <- !is.na(artist_data$timestamp)

artist_monthly_ms <- aggregate(
  ms_played ~ month,
  data = artist_data[artist_valid_months, ],
  FUN = function(x) sum(x, na.rm = TRUE)
)

artist_monthly_ms$hours <- round(
  artist_monthly_ms$ms_played / 3600000,
  2
)

artist_monthly_listening <- as.list(
  setNames(
    artist_monthly_ms$hours,
    artist_monthly_ms$month
  )
)

# Selected artist heatmap: month x time of day

artist_data$hour <- as.integer(
  format(
    artist_data$timestamp,
    "%H",
    tz = "Asia/Kolkata"
  )
)

#hour extracted ^

artist_data$time_of_day <- cut(
  artist_data$hour,
  breaks = c(-1, 5, 11, 16, 20, 23),
  labels = c(
    "Night",
    "Morning",
    "Afternoon",
    "Evening",
    "Late Evening"
  )
)

# Exclude records with invalid timestamps or time categories

artist_heatmap_data <- artist_data[
  !is.na(artist_data$timestamp) &
    !is.na(artist_data$time_of_day),
]

# Keep months in chronological order

month_levels <- sort(unique(artist_heatmap_data$month))

# Handle an empty heatmap safely

if (length(month_levels) == 0) {

  artist_heatmap <- list()

} else {

  artist_heatmap_data$month <- factor(
    artist_heatmap_data$month,
    levels = month_levels
  )

  # Count listening records for every month/time combination

  heatmap_counts <- as.data.frame(
    table(
      month = artist_heatmap_data$month,
      timeOfDay = artist_heatmap_data$time_of_day
    ),
    stringsAsFactors = FALSE
  )

  # Convert counts into nested lists for JSON

  artist_heatmap <- lapply(
    month_levels,
    function(month_value) {

      month_counts <- heatmap_counts[
        heatmap_counts$month == month_value,
      ]

      as.list(
        setNames(
          as.integer(month_counts$Freq),
          as.character(month_counts$timeOfDay)
        )
      )
    }
  )

  names(artist_heatmap) <- month_levels
}

# Correlation between the two artists' monthly listening hours

correlation_value <- NA_real_
correlation_monthly <- list()

if (!is.null(opponent_artist)) {

  # Verify that the opponent exists in the listening history

  opponent_records <- !is.na(data$master_metadata_album_artist_name) &
    data$master_metadata_album_artist_name == opponent_artist

  if (!any(opponent_records)) {
    stop("No listening history found for the opponent artist.")
  }

  # Use valid timestamps to establish the complete month range

  valid_timestamps <- data$timestamp[!is.na(data$timestamp)]

  if (length(valid_timestamps) > 0) {

    start_month <- as.Date(
      format(
        min(valid_timestamps),
        "%Y-%m-01",
        tz = "Asia/Kolkata"
      )
    )

    end_month <- as.Date(
      format(
        max(valid_timestamps),
        "%Y-%m-01",
        tz = "Asia/Kolkata"
      )
    )

    all_months <- format(
      seq(start_month, end_month, by = "month"),
      "%Y-%m"
    )

    # Initialize monthly listening hours to zero

    artist_a_hours <- setNames(
      rep(0, length(all_months)),
      all_months
    )

    artist_b_hours <- setNames(
      rep(0, length(all_months)),
      all_months
    )

    # Exclude records with invalid timestamps or durations

    valid_data <- data[
      !is.na(data$timestamp) &
        !is.na(data$ms_played),
    ]

    # Calculate monthly listening hours for the original artist

    artist_a_data <- valid_data[
      !is.na(valid_data$master_metadata_album_artist_name) &
        valid_data$master_metadata_album_artist_name == selected_artist,
    ]

    if (nrow(artist_a_data) > 0) {

      monthly_a <- tapply(
        artist_a_data$ms_played,
        artist_a_data$month,
        sum,
        na.rm = TRUE
      )

      artist_a_hours[names(monthly_a)] <- monthly_a / 3600000
    }

    # Calculate monthly listening hours for the opponent artist

    artist_b_data <- valid_data[
      !is.na(valid_data$master_metadata_album_artist_name) &
        valid_data$master_metadata_album_artist_name == opponent_artist,
    ]

    if (nrow(artist_b_data) > 0) {

      monthly_b <- tapply(
        artist_b_data$ms_played,
        artist_b_data$month,
        sum,
        na.rm = TRUE
      )

      artist_b_hours[names(monthly_b)] <- monthly_b / 3600000
    }

    # Calculate Pearson correlation when mathematically valid

    if (
      length(all_months) >= 2 &&
        sd(artist_a_hours) > 0 &&
        sd(artist_b_hours) > 0
    ) {

      correlation_value <- cor(
        artist_a_hours,
        artist_b_hours,
        method = "pearson"
      )
    }

    # Prepare paired monthly data for the frontend graph

    correlation_monthly <- lapply(
      seq_along(all_months),
      function(i) {

        list(
          month = all_months[i],
          artistHours = round(
            unname(artist_a_hours[i]),
            2
          ),
          opponentHours = round(
            unname(artist_b_hours[i]),
            2
          )
        )
      }
    )
  }
}

# Prepare JSON response

result <- list(

  selectedArtist = selected_artist,

  totalHours = round(total_hours, 2),
  totalPlays = total_plays,
  averageSeconds = round(avg_seconds, 2),
  favouriteSong = fav_song,
  favouriteAlbum = fav_album,

  skipRate = if (is.na(skip_rate)) {
    NULL
  } else {
    round(skip_rate, 2)
  },

  monthlyListening = monthly_listening,
  playsByTime = as.list(plays_by_time),

  artistHours = round(artist_hours, 2),
  artistPlays = artist_plays,
  artistLoyalty = round(artist_loyalty, 2),
  artistFavouriteSong = artist_favourite_song,
  artistFavouriteAlbum = artist_favourite_album,

  artistSkipRate = if (is.na(artist_skip_rate)) {
    NULL
  } else {
    round(artist_skip_rate, 2)
  },

  artistMonthlyListening = artist_monthly_listening,
  artistHeatmap = artist_heatmap,

  # Correlation results

  correlationArtist = if (is.null(opponent_artist)) {
    NULL
  } else {
    selected_artist
  },

  correlationOpponent = opponent_artist,

  correlation = if (is.na(correlation_value)) {
    NULL
  } else {
    round(correlation_value, 4)
  },

  correlationMonthly = correlation_monthly
)

# Output JSON for Node.js

cat(
  toJSON(
    result,
    auto_unbox = TRUE,
    null = "null"
  )
)