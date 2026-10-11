library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)
file_path <- args[1]

data <- read.csv(file_path)

columns_to_remove <- c(
    "incognito_mode",
    "offline_timestamp",
    "offline",
    "spotify_episode_uri",
    "audiobook_title",
    "audiobook_uri",
    "audiobook_chapter_uri",
    "audiobook_chapter_title",
    "spotify_track_uri",
    "episode_name",
    "episode_show_name",
    "conn_country",
    "ip_addr",
    "platform"
)

data <- data[, !(names(data) %in% columns_to_remove)]

data$timestamp <- as.POSIXct(
  data$ts,
  format = "%Y-%m-%dT%H:%M:%SZ",
  tz = "UTC"
)

data$month <- format(data$timestamp, "%B")
data$year <- as.integer(format(data$timestamp, "%Y"))

hour <- as.integer(format(data$timestamp, "%H"))

data$time_of_day <- ifelse(
    hour >= 5 & hour < 12, "Morning",
    ifelse(
        hour >= 12 & hour < 17, "Afternoon",
        ifelse(
            hour >= 17 & hour < 21, "Evening",
            "Night"
        )
    )
)

artists <- unique(data$master_metadata_album_artist_name)
artists <- artists[!is.na(artists) & artists != ""]

cat(toJSON(artists, auto_unbox = FALSE))