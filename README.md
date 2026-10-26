# 🎧 [Rhapsody] – Spotify Listening History Analyzer

Upload your Spotify listening history and get statistical insights, artist-vs-artist comparisons, song recommendations, and next-month listening predictions. A Node.js backend runs the analysis in R, and a React dashboard shows the results.

> Built for the Probability & Statistics course (B.Tech CSE-DS), SVKM's NMIMS Hyderabad.

## ✨ Features

- **Listening predictions:** the probability that you'll listen to an artist next month, estimated three ways:
  - **Historical frequency:** the share of past months with a real listen.
  - **Conditional probability:** a Markov-style estimate from month-to-month transitions, given whether you listened last month.
  - **Bayesian estimate:** a Beta(1,1) prior, which gives `(k + 1) / (n + 2)`.
- **Artist vs. artist:** compares two artists' monthly listening hours with Pearson correlation.
- **Listening habits:** a month × time-of-day heatmap, skip rate, artist loyalty, favourite song and album, and monthly trends.
- **Song recommendations:** ranks songs by comparing each song's completion rate to your baseline with a binomial normal-approximation z-score. The score is then combined with how many months you kept listening to the song.
- **Distribution diagnostics:** skewness, kurtosis, and Spearman rank correlation.

Only plays of **30 seconds or longer** count as listens, which matches Spotify's own rule for counting a stream.

## 🧮 Statistical Methods

| Area | Methods |
|---|---|
| Descriptive | Totals, means, frequency counts (mode), proportions |
| Probability | Historical frequency, conditional (transition) probability, Bayesian posterior (Beta-Binomial) |
| Inference | Bernoulli trials, normal approximation to the binomial, z-score standardisation, minimum sample rule (n·p ≥ 5) |
| Association | Pearson and Spearman correlation |
| Shape | Skewness and kurtosis |

## 🛠️ Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Middleware | Multer (file upload), CORS |
| Analysis | R, `jsonlite` |

## ⚙️ How It Works

1. The user uploads a Spotify history CSV file.
2. Express and Multer receive the file and run the R scripts with the CSV path and the selected artist(s) as arguments.
3. R cleans the data, computes the statistics and probabilities, and prints JSON.
4. Node.js sends the JSON to the frontend, which renders the charts.

## 📥 Getting Your Data

Request your data from Spotify at https://www.spotify.com/in-en/account/privacy/ and make sure to convert the received JSON files to CSV.

Note: Create an "uploads" folder under the backend folder. All your csv files will be saved there.
