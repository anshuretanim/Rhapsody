
library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 2) {
  stop("CSV file path and selected artist are required.")
}

file_path <- args[1]
selected_artist <- args[2]

data <- read.csv(file_path, stringsAsFactors = FALSE)

required_columns <- c(
  "ts",
  "ms_played",
  "master_metadata_track_name",
  "master_metadata_album_artist_name",
  "master_metadata_album_album_name",
  "skipped"
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
avg_ms <- if (total_plays > 0) total_ms / total_plays else 0
avg_seconds <- avg_ms / 1000

# Favourite song across all artists
song_counts <- sort(
  table(data$master_metadata_track_name[
    valid_tracks
  ]),
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
  table(data$master_metadata_album_album_name[
    valid_albums
  ]),
  decreasing = TRUE
)

fav_album <- if (length(album_counts) > 0) {
  names(album_counts)[1]
} else {
  "Unknown"
}

# Skip rate across all artists
skipped_values <- tolower(trimws(as.character(data$skipped)))

valid_skips <- !is.na(data$skipped) &
  skipped_values %in% c("true", "false", "1", "0")

skip_rate <- if (sum(valid_skips) > 0) {
  mean(skipped_values[valid_skips] %in% c("true", "1")) * 100
} else {
  NA_real_
}

# Parse timestamps
data$timestamp <- as.POSIXct(
  data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

# Monthly listening hours across all artists
data$month <- format(data$timestamp, "%Y-%m")

valid_months <- !is.na(data$month)

monthly_ms <- aggregate(
  ms_played ~ month,
  data = data[valid_months, ],
  FUN = function(x) sum(x, na.rm = TRUE)
)

monthly_ms$hours <- round(monthly_ms$ms_played / 3600000, 2)

monthly_listening <- as.list(
  setNames(monthly_ms$hours, monthly_ms$month)
)

# Plays by time of day across all artists
data$hour <- as.integer(format(data$timestamp, "%H"))

data$time_of_day <- cut(
  data$hour,
  breaks = c(-1, 5, 11, 16, 20, 23),
  labels = c("Night", "Morning", "Afternoon", "Evening", "Late Evening")
)

plays_by_time <- table(data$time_of_day, useNA = "no")

# Selected artist listening time
artist_ms <- sum(artist_data$ms_played, na.rm = TRUE)
artist_hours <- artist_ms / 3600000

# Selected artist play count
artist_valid_tracks <- !is.na(artist_data$master_metadata_track_name) &
  artist_data$master_metadata_track_name != ""

artist_plays <- sum(artist_valid_tracks)

# Selected artist's most-played song
artist_song_counts <- sort(
  table(artist_data$master_metadata_track_name[
    artist_valid_tracks
  ]),
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
  table(artist_data$master_metadata_album_album_name[
    artist_valid_albums
  ]),
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
artist_skipped_values <- tolower(trimws(as.character(artist_data$skipped)))

artist_valid_skips <- !is.na(artist_data$skipped) &
  artist_skipped_values %in% c("true", "false", "1", "0")

artist_skip_rate <- if (sum(artist_valid_skips) > 0) {
  mean(
    artist_skipped_values[artist_valid_skips] %in% c("true", "1")
  ) * 100
} else {
  NA_real_
}

# Selected artist listening by month
artist_data$timestamp <- as.POSIXct(
  artist_data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

artist_data$month <- format(artist_data$timestamp, "%Y-%m")

artist_valid_months <- !is.na(artist_data$month)

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
  setNames(artist_monthly_ms$hours, artist_monthly_ms$month)
)

# Prepare JSON response
result <- list(
  selectedArtist = selected_artist,

  totalHours = round(total_hours, 2),
  totalPlays = total_plays,
  averageSeconds = round(avg_seconds, 2),
  favouriteSong = fav_song,
  favouriteAlbum = fav_album,
  skipRate = if (is.na(skip_rate)) NULL else round(skip_rate, 2),

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
  artistMonthlyListening = artist_monthly_listening
)

# Output JSON for Node.js
cat(toJSON(result, auto_unbox = TRUE, null = "null"))
