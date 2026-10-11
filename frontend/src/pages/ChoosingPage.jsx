import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./ChoosingPage.css";

const musicFacts = [
  {
    category: "MUSIC HISTORY",
    fact: "MTV launched in 1981 with The Buggles' 'Video Killed the Radio Star' as its first music video.",
  },
  {
    category: "ROCK LEGENDS",
    fact: "Queen's 'We Will Rock You' uses stomps and claps instead of a conventional drum beat.",
  },
  {
    category: "CLASSICAL MUSIC",
    fact: "Beethoven continued composing music after becoming profoundly deaf. His Ninth Symphony premiered in 1824.",
  },
  {
    category: "ELECTRONIC MUSIC",
    fact: "Daft Punk's album Discovery inspired an entire animated science-fiction film called Interstella 5555.",
  },
  {
    category: "UNUSUAL RECORDS",
    fact: "Napalm Death's song 'You Suffer' lasts roughly 1.3 seconds. Barely enough time to regret pressing play.",
  },
  {
    category: "MUSIC THEORY",
    fact: "An octave sounds like the same musical note at a higher or lower pitch because the higher note has twice the frequency.",
  },
  {
    category: "STUDIO MAGIC",
    fact: "The famous THX cinema sound logo, known as the Deep Note, was created in 1983 by audio engineer James A. Moorer.",
  },
  {
    category: "THE BEATLES",
    fact: "The Beatles' 'Yesterday' is among the most recorded songs ever, with thousands of recorded versions.",
  },
  {
    category: "MUSIC & TECHNOLOGY",
    fact: "The first commercially released compact discs appeared in 1982, changing how people bought and listened to music.",
  },
  {
    category: "SOUND DESIGN",
    fact: "The Beatles experimented with reversed audio on several recordings, creating sounds that were difficult to produce with conventional instruments.",
  },
];

function ChoosingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const artists = location.state?.artists || [];

  const [selectedArtist, setSelectedArtist] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [musicFact] = useState(() => {
    return musicFacts[Math.floor(Math.random() * musicFacts.length)];
  });


async function sendArtist() {
    if (!selectedArtist || loading) return;

    setLoading(true);
    setError("");

    try {
        const response = await fetch("http://localhost:5000/artist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ artist: selectedArtist }),
        });

        const result = await response.json();

        console.log("Artist response:", result);

        if (!response.ok) {
            throw new Error(
                result.error || "Could not process this artist."
            );
        }

        navigate("/calculation", {
            state: {
                artist: selectedArtist,
                statistics: result.statistics,
            },
        });

    } catch (error) {
        console.error("Artist request failed:", error);
        setError(error.message || "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
}


  return (
    <main className="choosing-page">
      <div className="choosing-background-glow"></div>

      <div className="choosing-content">
        <h1 className="choosing-title">
          Pick your <span>headliner.</span>
        </h1>

        <section className="music-fact">
          <div className="fact-topline">
            <span className="fact-icon">♫</span>

            <span className="fact-heading">BETWEEN THE NOTES</span>

            <span className="fact-tag">{musicFact.category}</span>
          </div>

          <p className="fact-text">{musicFact.fact}</p>

          <div className="fact-bottomline">
            <span>A LITTLE MUSIC NERDINESS</span>

            <div className="sound-bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>

        <section className="artist-selector">
          <label className="artist-select-label" htmlFor="artist-select">
            CHOOSE AN ARTIST FROM YOUR HISTORY
          </label>

          <div className="select-wrapper">
            <select
              id="artist-select"
              className="artist-select"
              value={selectedArtist}
              onChange={(event) => {
                setSelectedArtist(event.target.value);
                setError("");
              }}
            >
              <option value="" disabled>
                Select your artist
              </option>

              {artists.map((artist) => (
                <option key={artist} value={artist}>
                  {artist}
                </option>
              ))}
            </select>

            <span className="select-arrow">⌄</span>
          </div>

          <p className="artist-hint">
            {artists.length > 0
              ? `${artists.length} artists found in your listening history`
              : "No artists found. Return to the home page and upload your Spotify CSV."}
          </p>

          <button
            className="analyze-button"
            onClick={sendArtist}
            disabled={!selectedArtist || loading}
          >
            {loading ? "PROCESSING..." : "EXPLORE THIS ARTIST"}

            {!loading && <span>↗</span>}
          </button>

          {error && (
            <p className="artist-error" role="alert">
              {error}
            </p>
          )}
        </section>

        <p className="choosing-footer">
          RHAPSODY <span>•</span> BUILT AROUND YOUR LISTENING HISTORY
        </p>
      </div>
    </main>
  );
}

export default ChoosingPage;
