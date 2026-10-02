const express = require("express");
const multer = require("multer");
const cors = require("cors");

const { spawn } = require("child_process");
// spawn lets your Node server run programs outside of Node itself.


const app = express();

app.use(cors());

const upload = multer({
    dest: "uploads/"
});

app.post("/upload", upload.single("file"), (req,res)=>{ //request received here
    console.log(req.file);

    const rProcess = spawn("Rscript", ["../analysis/analysis.R", req.file.path]);

    rProcess.stdout.on("data", (data) => {
        console.log(`R output: ${data}`);
    });

    rProcess.stderr.on("data", (data)=>{
        console.error(`R error: ${data}`);
    });

    rProcess.on("close", (code)=>{
        console.log(`R process exited with code ${code}`);
    });

    res.json({
        message: "File received successfully"
    });
});

app.listen(5000, ()=>{
    console.log("Server running on port 5000");
});

