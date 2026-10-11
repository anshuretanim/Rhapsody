import './Body.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Body() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleFile(event) {
        const file = event.target.files[0];

        if (!file) return;

        setError("");
        setLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            console.log("Backend response:", result);

            if (!response.ok) {
                throw new Error(result.error || "Upload failed");
            }

            navigate("/choosing", {
                state: { artists: result.artists }
            });

        } catch (error) {
            console.error(error);
            setError(error.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="lower-body">
            <div className="body-content">

                <p className="body-label">
                    YOUR LISTENING HISTORY, REIMAGINED
                </p>

                <h1 className="rhapsody-title">
                    RHAPSODY
                </h1>

                <div className="heading">
                    <h2 className="mainHeading">
                        Your music has a story.
                        <br />
                        <span>Let's uncover it.</span>
                    </h2>

                    <p className="body-description">
                        Upload your Spotify listening history
                        and discover what's behind your listening habits.
                    </p>

                    <form className="takeFile">
                        <label
                            className={`upload-button ${loading ? "is-loading" : ""}`}
                            htmlFor="spotify-file"
                        >
                            {loading ? "ANALYZING YOUR HISTORY..." : "CHOOSE YOUR SPOTIFY CSV"}
                        </label>

                        <input
                            id="spotify-file"
                            className="input-form"
                            type="file"
                            accept=".csv"
                            onChange={handleFile}
                            disabled={loading}
                        />
                    </form>

                    {loading && (
                        <p className="upload-status">
                            Processing your listening history. This may take a moment.
                        </p>
                    )}

                    {error && (
                        <p className="upload-error" role="alert">
                            {error}
                        </p>
                    )}

                    <p className="body-note">
                        <span className="green-dot"></span>
                        CSV FILES ONLY
                    </p>
                </div>

            </div>
        </div>
    );
}

export default Body;