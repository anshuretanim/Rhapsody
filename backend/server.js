const express = require("express");
const multer = require("multer");
const cors = require("cors");

const { spawn } = require("child_process");
// spawn lets your Node server run programs outside of Node itself.

const app = express();

app.use(cors());

const upload = multer({
  dest: "uploads/",
  // Creates a Multer configuration that stores uploaded files 
  // in the uploads/ directory

});

app.post("/upload", upload.single("file"), (req, res) => {
  //request received here
  console.log(req.file);

  const rProcess = spawn("Rscript", ["../analysis/analysis.R", req.file.path]);

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

    res.status(500).json({
      error: "Could not start R",
    });
  });

  rProcess.on("close", (code) => {
    console.log(`R process exited with code ${code}`);

    if (code != 0) {
      console.error(errorOutput);
      return res.status(500).json({
        error: "R processing failed",
      });
    }
    try {
      const artists = JSON.parse(output);

      res.json({
        message: "File processed successfully",
        artists: artists,
      });
    } catch (error) {
      console.error("Could not parse R output:", output);

      res.status(500).json({
        error: "Invalid output received from R",
      });
    }
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
