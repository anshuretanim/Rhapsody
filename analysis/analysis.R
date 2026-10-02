args <- commandArgs(trailingOnly = TRUE)

file_path <- args[1]

data <- read.csv(file_path)

print(names(data))
print(head(data))
