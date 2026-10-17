const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();

let uploadedFilePath = null;

app.use(cors());
app.use(express.json());

const upload = multer({
    dest: "uploads/",
});

// Run an R script and resolve with its parsed JSON output.
// Rejects with { message, details } so routes can report what R actually said.

function runR(scriptPath, scriptArgs) {
    return new Promise((resolve, reject) => {
        const rProcess = spawn("Rscript", [scriptPath, ...scriptArgs]);

        let output = "";
        let errorOutput = "";
        let settled = false;

        rProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        rProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        rProcess.on("error", (error) => {
            if (settled) return;
            settled = true;

            console.error("Failed to start R:", error);

            reject({
                message: "Could not start R.",
                details: error.message,
            });
        });

        rProcess.on("close", (code) => {
            if (settled) return;
            settled = true;

            if (code !== 0) {
                console.error(`R error (${scriptPath}):`, errorOutput);

                return reject({
                    message: "R processing failed.",
                    details: errorOutput,
                });
            }

            try {
                resolve(JSON.parse(output));
            } catch (error) {
                console.error("Could not parse R output:", output);

                reject({
                    message: "Could not parse R output.",
                    details: error.message,
                });
            }
        });
    });
}

function sendRError(res, error, fallbackMessage) {
    return res.status(500).json({
        error: error.message || fallbackMessage,
        details: error.details,
    });
}

// Upload Spotify CSV and retrieve artist names

app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: "Please upload a CSV file.",
        });
    }

    uploadedFilePath = req.file.path;

    try {
        const artists = await runR("../analysis/analysis.R", [
            uploadedFilePath,
        ]);

        console.log("Number of artists:", artists.length);

        return res.json({
            message: "File processed successfully.",
            artists: artists,
        });
    } catch (error) {
        return sendRError(res, error, "R processing failed.");
    }
});

// Analyze a single selected artist

app.post("/artist", async (req, res) => {
    const { artist } = req.body;

    if (!uploadedFilePath) {
        return res.status(400).json({
            error: "Please upload your Spotify CSV first.",
        });
    }

    if (!artist) {
        return res.status(400).json({
            error: "Artist name is required.",
        });
    }

    try {
        // No opponent argument: artist.R runs in single-artist mode
        const statistics = await runR("../analysis/artist.R", [
            uploadedFilePath,
            artist,
        ]);

        return res.json({
            message: "Analysis completed successfully.",
            artist: artist,
            statistics: statistics,
        });
    } catch (error) {
        return sendRError(res, error, "R processing failed.");
    }
});

// Compare two artists using monthly listening hours

app.post("/versus", async (req, res) => {
    const { artist, opponent } = req.body;

    if (!uploadedFilePath) {
        return res.status(400).json({
            error: "Please upload your Spotify CSV first.",
        });
    }

    if (!artist || !opponent) {
        return res.status(400).json({
            error: "Both artist names are required.",
        });
    }

    if (artist === opponent) {
        return res.status(400).json({
            error: "Please select two different artists.",
        });
    }

    try {
        const result = await runR("../analysis/artist.R", [
            uploadedFilePath,
            artist,
            opponent,
        ]);

        return res.json({
            message: "Artist comparison completed successfully.",
            artist: artist,
            opponent: opponent,
            correlation: result.correlation ?? null,
            correlationMonthly: result.correlationMonthly || [],
            listeningPredictions: result.listeningPredictions,
        });
    } catch (error) {
        return sendRError(res, error, "Artist comparison failed.");
    }
});

app.post("/ranking", async (req, res) => {
    if (!uploadedFilePath) {
        return res.status(400).json({
            error: "Please upload your Spotify CSV first.",
        });
    }

    try {
        const result = await runR("../analysis/ranking.R", [
            uploadedFilePath,
        ]);

        return res.json(result);
    } catch (error) {
        return sendRError(res, error, "Song ranking failed.");
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});