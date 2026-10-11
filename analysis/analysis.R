library(jsonlite)
args <- commandArgs(trailingOnly = TRUE)

file_path <- args[1]

data <- read.csv(file_path)
artists <- unique(data$artist_name)
artists <- artists[!is.na(artists) & artists != ""]

cat(jsonlite::toJSON(artists, auto_unbox = FALSE))
