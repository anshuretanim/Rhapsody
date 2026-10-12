
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RankingPage.css";

function RankingPage() {
    const navigate = useNavigate();

    const [rankingData, setRankingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchRanking() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    "http://localhost:5000/ranking",
                    {
                        method: "POST",
                        signal: controller.signal
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Failed to rank songs."
                    );
                }

                setRankingData(result);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Something went wrong.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchRanking();

        return () => controller.abort();
    }, []);

    function formatNumber(value, digits = 2) {
        if (value == null || !Number.isFinite(Number(value))) {
            return "N/A";
        }

        return Number(value).toFixed(digits);
    }

    function formatPercentage(value) {
        if (value == null || !Number.isFinite(Number(value))) {
            return "N/A";
        }

        return `${(Number(value) * 100).toFixed(1)}%`;
    }

    if (loading) {
        return (
            <main className="ranking-page">
                <div className="ranking-container ranking-message">
                    <div className="ranking-loader" />
                    <h2>Ranking your songs...</h2>
                    <p>
                        Analysing your listening history and calculating
                        statistical scores.
                    </p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="ranking-page">
                <div className="ranking-container ranking-message">
                    <h1>Ranking failed</h1>
                    <p className="ranking-error">{error}</p>

                    <button
                        className="ranking-button"
                        onClick={() => navigate(-1)}
                    >
                        Go back
                    </button>
                </div>
            </main>
        );
    }

    const {
        recommendations = [],
        diagnostics = {},
        completionMethod,
        baselineCompletionRate,
        minimumPlays,
        eligibleSongs
    } = rankingData || {};

    return (
        <main className="ranking-page">
            <div className="ranking-container">
                <button
                    className="ranking-back-button"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <header className="ranking-header">
                    <p className="ranking-eyebrow">
                        RHAPSODY / LISTENING ANALYTICS
                    </p>

                    <h1>Your song rankings</h1>

                    <p className="ranking-subtitle">
                        Songs ranked by completion behaviour and
                        consistency across listening months.
                    </p>
                </header>

                <section className="ranking-stats">
                    <article className="ranking-stat-card">
                        <p>Eligible songs</p>
                        <h2>{eligibleSongs ?? recommendations.length}</h2>
                    </article>

                    <article className="ranking-stat-card">
                        <p>Baseline completion</p>
                        <h2>
                            {formatPercentage(baselineCompletionRate)}
                        </h2>
                    </article>

                    <article className="ranking-stat-card">
                        <p>Minimum plays</p>
                        <h2>{minimumPlays ?? "N/A"}</h2>
                    </article>
                </section>

                <section className="ranking-panel">
                    <div className="ranking-section-heading">
                        <div>
                            <h2>Top songs</h2>
                            <p>
                                Ranked using completion score and
                                monthly listening consistency.
                            </p>
                        </div>
                    </div>

                    {recommendations.length === 0 ? (
                        <p className="ranking-empty">
                            No songs are available to display.
                        </p>
                    ) : (
                        <div className="ranking-table-wrapper">
                            <table className="ranking-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Song</th>
                                        <th>Artist</th>
                                        <th>Plays</th>
                                        <th>Completed</th>
                                        <th>Active months</th>
                                        <th>Final score</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recommendations.map((song) => (
                                        <tr
                                            key={`${song.rank}-${song.track}-${song.artist}`}
                                        >
                                            <td className="ranking-rank">
                                                {song.rank}
                                            </td>

                                            <td className="ranking-track">
                                                {song.track}
                                            </td>

                                            <td>{song.artist}</td>

                                            <td>{song.plays}</td>

                                            <td>
                                                {formatPercentage(
                                                    song.completion_rate
                                                )}
                                            </td>

                                            <td>{song.months_active}</td>

                                            <td className="ranking-score">
                                                {formatNumber(
                                                    song.final_score
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="ranking-panel">
                    <h2>Statistical diagnostics</h2>

                    <p className="ranking-panel-description">
                        These statistics describe the ranked songs and
                        how closely the final score relates to raw play
                        counts.
                    </p>

                    <div className="ranking-diagnostics">
                        <article className="ranking-diagnostic-card">
                            <p>Skewness</p>
                            <h3>
                                {formatNumber(diagnostics.skewness, 3)}
                            </h3>
                            <span>
                                Measures asymmetry in play counts.
                            </span>
                        </article>

                        <article className="ranking-diagnostic-card">
                            <p>Kurtosis</p>
                            <h3>
                                {formatNumber(diagnostics.kurtosis, 3)}
                            </h3>
                            <span>
                                Uses the fourth central moment.
                            </span>
                        </article>

                        <article className="ranking-diagnostic-card">
                            <p>Spearman correlation</p>
                            <h3>
                                {formatNumber(
                                    diagnostics.spearmanCorrelation,
                                    3
                                )}
                            </h3>
                            <span>
                                Measures rank association between final
                                scores and play counts.
                            </span>
                        </article>
                    </div>
                </section>

                <footer className="ranking-footer">
                    <p>
                        {completionMethod === "reason_end"
                            ? "Completion is estimated using Spotify's track-ending reason."
                            : "Completion is approximated using the inverse of the skipped flag."}
                    </p>

                    <p>
                        These rankings describe your listening patterns,
                        not an objective measure of song quality.
                    </p>
                </footer>
            </div>
        </main>
    );
}

export default RankingPage;
