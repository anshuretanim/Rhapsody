args <- commandArgs(trailingOnly = TRUE)
print(args)
file_path <- args[1]
print(file_path)
data <- read.csv(file_path)

print(names(data))
print(head(data))
