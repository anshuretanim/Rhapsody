import { useLocation } from "react-router-dom";

function ChoosingPage() {
    const location = useLocation();
    const artists = location.state?.artists || [];
  console.log("Artists received:", artists);
    return (
        <div>
            <select defaultValue="">
                <option value="" disabled>
                    Select an artist
                </option>

                {artists.map((artist) => (
                    <option key={artist} value={artist}>
                        {artist}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default ChoosingPage;