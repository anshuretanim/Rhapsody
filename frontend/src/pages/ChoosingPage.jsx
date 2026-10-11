import { useLocation } from "react-router-dom";
import { useState } from "react";

function ChoosingPage() {
  const location = useLocation();
  const artists = location.state?.artists || [];

  const [selectedArtist, setSelectedArtist] = useState("");

  console.log("Artists received:", artists);
  console.log("Selected artist:", selectedArtist);

async function sendArtist() {
    const response = await fetch("http://localhost:5000/artist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ artist: selectedArtist }),
    });

    const result = await response.json();
    console.log("Artist response:", result);
}

  return (
    <div>
      <select
        value={selectedArtist}
        onChange={(event) => setSelectedArtist(event.target.value)}
      >
        <option value="" disabled>
          Select an artist
        </option>

        {artists.map((artist) => (
          <option key={artist} value={artist}>
            {artist}
          </option>
        ))}
      </select>
      <button onClick={sendArtist}>Send artist</button>
    </div>
  );
}

export default ChoosingPage;
