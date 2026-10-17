library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)

# Usage:
#   Rscript artist.R <csv> <artist>              single-artist analysis
#   Rscript artist.R <csv> <artist> <opponent>   adds versus comparison

if (length(args) < 2) {
  stop("CSV file path and selected artist are required.")
}

file_path <- args[1]
selected_artist <- args[2]
opponent_artist <- if (length(args) >= 3 && nzchar(args[3])) args[3] else NULL
has_opponent <- !is.null(opponent_artist)

if (has_opponent && selected_artist == opponent_artist) {
  stop("Please select two different artists.")
}

# A play counts as a real "listen" if it lasted at least 30 seconds
# (Spotify's own threshold for counting a stream).
LISTEN_THRESHOLD_MS <- 30000

data <- read.csv(
  file_path,
  stringsAsFactors = FALSE,
  check.names = FALSE
)

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

if (!("reason_end" %in% names(data)) &&
    !("skipped" %in% names(data))) {
  stop("CSV needs either a reason_end or skipped column to calculate skip rate.")
}

if (!is.numeric(data$ms_played)) {
  stop("The ms_played column must contain numeric values.")
}

# Calculate skip rate

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

# Parse timestamps and create month labels

data$timestamp <- as.POSIXct(
  data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

data$month <- format(
  data$timestamp,
  "%Y-%m",
  tz = "Asia/Kolkata"
)

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

# Verify the artist(s) exist

artist_names <- data$master_metadata_album_artist_name

if (!any(!is.na(artist_names) & artist_names == selected_artist)) {
  stop("No listening history found for the selected artist.")
}

if (has_opponent &&
    !any(!is.na(artist_names) & artist_names == opponent_artist)) {
  stop("No listening history found for the opponent artist.")
}

# Establish the complete observed month range

valid_timestamps <- data$timestamp[!is.na(data$timestamp)]

if (length(valid_timestamps) == 0) {
  stop("No valid timestamps found in the CSV.")
}

start_month <- as.Date(
  paste0(
    format(
      min(valid_timestamps),
      "%Y-%m",
      tz = "Asia/Kolkata"
    ),
    "-01"
  )
)

end_month <- as.Date(
  paste0(
    format(
      max(valid_timestamps),
      "%Y-%m",
      tz = "Asia/Kolkata"
    ),
    "-01"
  )
)

month_dates <- seq(
  start_month,
  end_month,
  by = "month"
)

all_months <- format(month_dates, "%Y-%m")

next_month <- format(
  seq(end_month, by = "month", length.out = 2)[2],
  "%Y-%m"
)

# Estimate the three probabilities for an artist

predict_artist <- function(artist_name, df, months) {

  # Only real listens (>= 30 seconds) count toward "listened this month"
  artist_records <- df[
    !is.na(df$master_metadata_album_artist_name) &
      df$master_metadata_album_artist_name == artist_name &
      !is.na(df$timestamp) &
      !is.na(df$ms_played) &
      df$ms_played >= LISTEN_THRESHOLD_MS,
  ]

  # Mark each month as 1 if the artist was played, otherwise 0

  played_months <- unique(artist_records$month)

  monthly_status <- as.integer(months %in% played_months)

  number_of_months <- length(monthly_status)
  months_listened <- sum(monthly_status)

  # 1. Historical listening frequency

  historical_probability <- mean(monthly_status)

  # 2. Conditional probability using consecutive months

  conditional_probability <- historical_probability
  conditional_source <- "historical_fallback"
  transition_count <- 0
  transition_successes <- 0

  if (number_of_months >= 2) {

    previous_status <- monthly_status[-number_of_months]
    next_status <- monthly_status[-1]

    # Use transitions whose starting status matches the latest month

    last_status <- monthly_status[number_of_months]

    matching_transitions <- previous_status == last_status

    transition_count <- sum(matching_transitions)

    if (transition_count > 0) {

      transition_successes <- sum(
        next_status[matching_transitions] == 1
      )

      conditional_probability <- (
        transition_successes / transition_count
      )

      conditional_source <- "transition"
    }
  }

  # 3. Bayesian estimate using a Beta(1, 1) prior
  #
  # Posterior predictive probability:
  # (months_listened + 1) / (number_of_months + 2)

  bayesian_probability <- (
    months_listened + 1
  ) / (
    number_of_months + 2
  )

  list(
    artist = artist_name,
    predictionMonth = next_month,
    monthsObserved = number_of_months,
    monthsListened = months_listened,
    lastObservedMonth = tail(months, 1),
    lastMonthListened = tail(monthly_status, 1) == 1,

    historicalProbability = round(
      historical_probability, 4
    ),

    conditionalProbability = round(
      conditional_probability, 4
    ),

    conditionalSource = conditional_source,
    transitionCount = transition_count,
    transitionSuccesses = transition_successes,

    bayesianProbability = round(
      bayesian_probability, 4
    )
  )
}

selected_prediction <- predict_artist(
  selected_artist,
  data,
  all_months
)

opponent_prediction <- if (has_opponent) {
  predict_artist(opponent_artist, data, all_months)
} else {
  NULL
}

# Total listening statistics

total_ms <- sum(data$ms_played, na.rm = TRUE)
total_hours <- total_ms / 3600000

valid_tracks <- !is.na(data$master_metadata_track_name) &
  data$master_metadata_track_name != ""

total_plays <- sum(valid_tracks)

avg_seconds <- if (total_plays > 0) {
  total_ms / total_plays / 1000
} else {
  0
}

# Favourite song across all artists

song_counts <- sort(
  table(data$master_metadata_track_name[valid_tracks]),
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

skip_rate <- calc_skip_rate(data)

# Monthly listening hours across all artists

valid_month_records <- data[!is.na(data$timestamp), ]

monthly_ms <- aggregate(
  ms_played ~ month,
  data = valid_month_records,
  FUN = function(x) sum(x, na.rm = TRUE)
)

monthly_ms$hours <- round(
  monthly_ms$ms_played / 3600000,
  2
)

monthly_listening <- as.list(
  setNames(monthly_ms$hours, monthly_ms$month)
)

# Plays by time of day

plays_by_time <- table(
  data$time_of_day,
  useNA = "no"
)

# Selected artist statistics

artist_data <- data[
  !is.na(data$master_metadata_album_artist_name) &
    data$master_metadata_album_artist_name == selected_artist,
]

artist_ms <- sum(artist_data$ms_played, na.rm = TRUE)
artist_hours <- artist_ms / 3600000

artist_valid_tracks <- !is.na(artist_data$master_metadata_track_name) &
  artist_data$master_metadata_track_name != ""

artist_plays <- sum(artist_valid_tracks)

artist_song_counts <- sort(
  table(
    artist_data$master_metadata_track_name[artist_valid_tracks]
  ),
  decreasing = TRUE
)

artist_favourite_song <- if (length(artist_song_counts) > 0) {
  names(artist_song_counts)[1]
} else {
  "Unknown"
}

artist_valid_albums <- !is.na(artist_data$master_metadata_album_album_name) &
  artist_data$master_metadata_album_album_name != ""

artist_album_counts <- sort(
  table(
    artist_data$master_metadata_album_album_name[artist_valid_albums]
  ),
  decreasing = TRUE
)

artist_favourite_album <- if (length(artist_album_counts) > 0) {
  names(artist_album_counts)[1]
} else {
  "Unknown"
}

artist_loyalty <- if (total_ms > 0) {
  artist_ms / total_ms * 100
} else {
  0
}

artist_skip_rate <- calc_skip_rate(artist_data)

# Selected artist monthly listening hours

artist_monthly_ms <- aggregate(
  ms_played ~ month,
  data = artist_data[!is.na(artist_data$timestamp), ],
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

artist_heatmap_data <- artist_data[
  !is.na(artist_data$timestamp) &
    !is.na(artist_data$time_of_day),
]

month_levels <- sort(unique(artist_heatmap_data$month))

if (length(month_levels) == 0) {

  artist_heatmap <- list()

} else {

  artist_heatmap_data$month <- factor(
    artist_heatmap_data$month,
    levels = month_levels
  )

  heatmap_counts <- as.data.frame(
    table(
      month = artist_heatmap_data$month,
      timeOfDay = artist_heatmap_data$time_of_day
    ),
    stringsAsFactors = FALSE
  )

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

# Correlation between both artists' monthly listening hours
# (only when an opponent was supplied)

correlation_value <- NA_real_
correlation_monthly <- list()

if (has_opponent) {

  valid_data <- data[
    !is.na(data$timestamp) &
      !is.na(data$ms_played),
  ]

  artist_a_hours <- setNames(
    rep(0, length(all_months)),
    all_months
  )

  artist_b_hours <- setNames(
    rep(0, length(all_months)),
    all_months
  )

  artist_a_data <- valid_data[
    !is.na(valid_data$master_metadata_album_artist_name) &
      valid_data$master_metadata_album_artist_name == selected_artist,
  ]

  artist_b_data <- valid_data[
    !is.na(valid_data$master_metadata_album_artist_name) &
      valid_data$master_metadata_album_artist_name == opponent_artist,
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

  if (nrow(artist_b_data) > 0) {

    monthly_b <- tapply(
      artist_b_data$ms_played,
      artist_b_data$month,
      sum,
      na.rm = TRUE
    )

    artist_b_hours[names(monthly_b)] <- monthly_b / 3600000
  }

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

  correlation_monthly <- lapply(
    seq_along(all_months),
    function(i) {

      list(
        month = all_months[i],
        artistHours = round(
          unname(artist_a_hours[i]), 2
        ),
        opponentHours = round(
          unname(artist_b_hours[i]), 2
        )
      )
    }
  )
}

# Prepare JSON response

predictions <- list(selectedArtist = selected_prediction)

if (has_opponent) {
  predictions$opponentArtist <- opponent_prediction
}

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

  listeningPredictions = predictions
)

if (has_opponent) {
  result$opponentArtist <- opponent_artist
  result$correlationArtist <- selected_artist
  result$correlationOpponent <- opponent_artist
  result$correlation <- if (is.na(correlation_value)) {
    NULL
  } else {
    round(correlation_value, 4)
  }
  result$correlationMonthly <- correlation_monthly
}

# Output JSON for Node.js

cat(
  toJSON(
    result,
    auto_unbox = TRUE,
    null = "null"
  )
)