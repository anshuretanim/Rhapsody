
library(jsonlite)

# 1. Read the uploaded CSV
args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 1) {
  stop("CSV file path is required.")
}

spotify <- read.csv(
  args[1],
  stringsAsFactors = FALSE,
  check.names = FALSE
)

find_column <- function(options, available) {
  matches <- match(tolower(options), tolower(available))
  matches <- matches[!is.na(matches)]

  if (length(matches) == 0) {
    return(NA_character_)
  }

  available[matches[1]]
}

time_col <- find_column(c("ts", "timestamp"), names(spotify))
track_col <- find_column(
  c("master_metadata_track_name", "track_name"),
  names(spotify)
)
artist_col <- find_column(
  c("master_metadata_album_artist_name", "artist_name"),
  names(spotify)
)
duration_col <- find_column(c("ms_played"), names(spotify))
uri_col <- find_column(c("spotify_track_uri"), names(spotify))
reason_col <- find_column(c("reason_end"), names(spotify))
skip_col <- find_column(c("skipped"), names(spotify))

required <- c(track_col, artist_col, duration_col)

if (any(is.na(required))) {
  stop("CSV must contain track name, artist name, and ms_played columns.")
}

if (is.na(reason_col) && is.na(skip_col)) {
  stop("CSV needs either reason_end or skipped to estimate completion.")
}

# 2. Prepare the data
spotify$track <- trimws(as.character(spotify[[track_col]]))
spotify$artist <- trimws(as.character(spotify[[artist_col]]))
spotify$ms_played <- suppressWarnings(
  as.numeric(spotify[[duration_col]])
)

if (!is.na(time_col)) {
  spotify$played_at <- as.POSIXct(
    sub("Z$", "", as.character(spotify[[time_col]])),
    tz = "UTC"
  )
  spotify$month <- format(spotify$played_at, "%Y-%m")
} else {
  stop("CSV needs a timestamp column named ts or timestamp.")
}

if (!is.na(uri_col)) {
  spotify$song_id <- trimws(as.character(spotify[[uri_col]]))
} else {
  spotify$song_id <- paste(
    spotify$artist,
    spotify$track,
    sep = "|||"
  )
}

# Remove invalid song records
spotify <- spotify[
  !is.na(spotify$played_at) &
    !is.na(spotify$ms_played) &
    spotify$ms_played > 0 &
    !is.na(spotify$track) &
    spotify$track != "" &
    !is.na(spotify$artist) &
    spotify$artist != "" &
    !is.na(spotify$song_id) &
    spotify$song_id != "",
]

if (nrow(spotify) == 0) {
  stop("No valid song plays were found in the CSV.")
}

# 3. Determine completion for each play
if (!is.na(reason_col)) {
  reason <- tolower(trimws(as.character(spotify[[reason_col]])))

  # Only known ending reasons are included.
  known <- !is.na(reason) & reason != ""

  spotify <- spotify[known, ]
  reason <- reason[known]

  spotify$liked <- as.numeric(reason == "trackdone")
  completion_method <- "reason_end"
} else {
  skipped <- tolower(
    trimws(as.character(spotify[[skip_col]]))
  )

  known <- skipped %in% c(
    "true", "false", "1", "0", "yes", "no"
  )

  spotify <- spotify[known, ]
  skipped <- skipped[known]

  spotify$liked <- as.numeric(
    skipped %in% c("false", "0", "no")
  )

  completion_method <- "inverse_skipped"
}

if (nrow(spotify) == 0) {
  stop("No plays with a known completion status were found.")
}

p0 <- mean(spotify$liked)

if (p0 <= 0 || p0 >= 1) {
  stop("Completion scoring requires both completed and non-completed plays.")
}

# 4. Summarise each song
song_groups <- split(spotify, spotify$song_id)

songs <- do.call(rbind, lapply(names(song_groups), function(id) {
  group <- song_groups[[id]]

  data.frame(
    song_id = id,
    track = group$track[1],
    artist = group$artist[1],
    plays = nrow(group),
    liked_plays = sum(group$liked),
    completion_rate = mean(group$liked),
    months_active = length(unique(group$month)),
    stringsAsFactors = FALSE
  )
}))

rownames(songs) <- NULL

# 5. Normal-approximation score
min_plays <- ceiling(5 / min(p0, 1 - p0))

songs$score <- (
  songs$liked_plays - songs$plays * p0
) / sqrt(
  songs$plays * p0 * (1 - p0)
)

ranked <- songs[songs$plays >= min_plays, ]

if (nrow(ranked) < 2) {
  stop("Too few songs meet the minimum plays requirement.")
}

# 6. Standardise score and monthly consistency
z <- function(v) {
  spread <- sqrt(mean((v - mean(v))^2))

  if (!is.finite(spread) || spread == 0) {
    return(rep(0, length(v)))
  }

  (v - mean(v)) / spread
}

ranked$final_score <- z(ranked$score) +
  z(ranked$months_active)

ranked <- ranked[
  order(-ranked$final_score, -ranked$plays),
]

ranked$rank <- seq_len(nrow(ranked))

# 7. Statistical diagnostics
m <- mean(ranked$plays)
m2 <- mean((ranked$plays - m)^2)
m3 <- mean((ranked$plays - m)^3)
m4 <- mean((ranked$plays - m)^4)

skewness <- if (m2 > 0) m3 / m2^1.5 else 0
kurtosis <- if (m2 > 0) m4 / m2^2 else 0

rho <- if (
  length(unique(ranked$final_score)) > 1 &&
  length(unique(ranked$plays)) > 1
) {
  cor(
    ranked$final_score,
    ranked$plays,
    method = "spearman"
  )
} else {
  NA_real_
}

# 8. Return JSON only
top <- head(
  ranked[
    ,
    c(
      "rank", "track", "artist", "plays",
      "liked_plays", "completion_rate",
      "months_active", "score", "final_score"
    )
  ],
  25
)

result <- list(
  completionMethod = completion_method,
  baselineCompletionRate = p0,
  minimumPlays = min_plays,
  eligibleSongs = nrow(ranked),
  diagnostics = list(
    skewness = skewness,
    kurtosis = kurtosis,
    spearmanCorrelation = rho
  ),
  recommendations = top
)

cat(
  toJSON(
    result,
    dataframe = "rows",
    auto_unbox = TRUE,
    na = "null"
  )
)
