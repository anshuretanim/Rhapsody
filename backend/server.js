const express = require("express");
const multer = require("multer");
const cors = require("cors");

const { spawn } = require("child_process");
// spawn lets your Node server run programs outside of Node itself.
let uploadedFilePath = null;
const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/",
  // Creates a Multer configuration that stores uploaded files
  // in the uploads/ directory
});


app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: "Please upload a CSV file."
        });
    }

    uploadedFilePath = req.file.path;

    const rProcess = spawn("Rscript", [
        "../analysis/analysis.R",
        uploadedFilePath
    ]);

    let output = "";
    let errorOutput = "";
    let responded = false;

    rProcess.stdout.on("data", (data) => {
        output += data.toString();
    });

    rProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    rProcess.on("error", (error) => {
        console.error("Failed to start R:", error);
        responded = true;

        return res.status(500).json({
            error: "Could not start R."
        });
    });

    rProcess.on("close", (code) => {
        if (responded) return;

        if (code !== 0) {
            console.error("R error:", errorOutput);

            return res.status(500).json({
                error: "R processing failed."
            });
        }

        try {
const artists = JSON.parse(output);

console.log("Number of artists:", artists.length);

return res.json({
    message: "File processed successfully.",
    artists: artists
});
        } catch (error) {
            console.error("Could not parse R output:", output);

            return res.status(500).json({
                error: "Invalid JSON received from R."
            });
        }
    });
});

///////////////////////////////////////////////////////

app.post("/artist", (req, res) => {
    const artist = req.body.artist;

    if (!uploadedFilePath) {
        return res.status(400).json({
            error: "Please upload your Spotify CSV first."
        });
    }

    if (!artist) {
        return res.status(400).json({
            error: "Artist name is required."
        });
    }

    const rProcess = spawn("Rscript", [
        "../analysis/artist.R",
        uploadedFilePath, artist
    ]);

    let output = "";
    let errorOutput = "";

    rProcess.stdout.on("data", (data) => {
        output += data.toString();
    });

    rProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    rProcess.on("error", (error) => {
        console.error("Failed to start R:", error);

        return res.status(500).json({
            error: "Could not start R."
        });
    });

    rProcess.on("close", (code) => {
        if (code !== 0) {
            console.error("R error:", errorOutput);

            return res.status(500).json({
                error: "R processing failed.",
                details: errorOutput
            });
        }

        try {
            const statistics = JSON.parse(output);

            return res.json({
                message: "Analysis completed successfully.",
                artist: artist,
                statistics: statistics
            });
        } catch (error) {
            console.error("Invalid JSON from R:", output);

            return res.status(500).json({
                error: "Could not parse R output."
            });
        }
    });
});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});
