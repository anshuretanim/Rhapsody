
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CalculationPage.css";

const TIME_PERIODS = [
    "Night",
    "Morning",
    "Afternoon",
    "Evening",
    "Late Evening",
];

function StatCard({ label, value, detail }) {
    return (
        <article className="stat-card">
            <p className="stat-label">{label}</p>
            <h3 className="stat-value">{value}</h3>
            {detail && <p className="stat-detail">{detail}</p>}
        </article>
    );
}

function ListeningBars({ data, suffix = "hours" }) {
    const entries = Object.entries(data || {});
    const maxValue = Math.max(
        ...entries.map(([, value]) => Number(value) || 0),
        1
    );

    if (entries.length === 0) {
        return <p className="empty-chart">No listening data available.</p>;
    }

    return (
        <div className="listening-bars">
            {entries.map(([label, value]) => {
                const numericValue = Number(value) || 0;
                const width = Math.max(
                    numericValue > 0 ? 2 : 0,
                    (numericValue / maxValue) * 100
                );

                return (
                    <div className="listening-bar-row" key={label}>
                        <span className="bar-label">{label}</span>

                        <div className="bar-track">
                            <div
                                className="bar-fill"
                                style={{ width: `${width}%` }}
                            />
                        </div>

                        <span className="bar-value">
                            {numericValue} {suffix}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function ListeningHeatmap({ data }) {
    const months = Object.entries(data || {}).sort(
        ([monthA], [monthB]) => monthA.localeCompare(monthB)
    );

    if (months.length === 0) {
        return (
            <p className="empty-chart">
                No artist heatmap data available.
            </p>
        );
    }

    const getCount = (monthData, period) =>
        Number(monthData?.[period]) || 0;

    const maxCount = Math.max(
        ...months.flatMap(([, monthData]) =>
            TIME_PERIODS.map((period) => getCount(monthData, period))
        ),
        0
    );

    const getIntensity = (count) => {
        if (count === 0 || maxCount === 0) {
            return 0;
        }

        return Math.max(1, Math.ceil((count / maxCount) * 5));
    };

    return (
        <div className="heatmap-wrapper">
            <div
                className="listening-heatmap"
                role="table"
                aria-label="Selected artist listening records by month and time of day"
            >
                <div className="heatmap-row heatmap-header" role="row">
                    <div
                        className="heatmap-month-label"
                        role="columnheader"
                    >
                        MONTH
                    </div>

                    {TIME_PERIODS.map((period) => (
                        <div
                            className="heatmap-period-label"
                            role="columnheader"
                            key={period}
                        >
                            {period}
                        </div>
                    ))}
                </div>

                {months.map(([month, monthData]) => (
                    <div
                        className="heatmap-row"
                        role="row"
                        key={month}
                    >
                        <div
                            className="heatmap-month-label"
                            role="rowheader"
                        >
                            {month}
                        </div>

                        {TIME_PERIODS.map((period) => {
                            const count = getCount(monthData, period);
                            const intensity = getIntensity(count);

                            return (
                                <div
                                    className="heatmap-cell-container"
                                    role="cell"
                                    key={period}
                                >
                                    <div
                                        className={`heatmap-cell intensity-${intensity}`}
                                        title={`${month} · ${period}: ${count} recorded track entries`}
                                        aria-label={`${month}, ${period}: ${count} recorded track entries`}
                                    >
                                        <span>{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="heatmap-legend">
                <span>FEWER RECORDS</span>

                <div className="heatmap-legend-colors">
                    {[0, 1, 2, 3, 4, 5].map((intensity) => (
                        <span
                            key={intensity}
                            className={`heatmap-legend-cell intensity-${intensity}`}
                        />
                    ))}
                </div>

                <span>MORE RECORDS</span>
            </div>

            <p className="heatmap-note">
                Each cell shows the number of recorded track entries for
                that month and time period. Color intensity is relative to
                the highest count in this heatmap.
            </p>
        </div>
    );
}

function CalculationPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const selectedArtist = location.state?.artist || "";
    const stats = location.state?.statistics;

    const artists = location.state?.artists || [];

    const [opponent, setOpponent] = useState("");

    const opponentArtists = artists.filter(
        (artist) => artist && artist !== selectedArtist
    );

    if (!stats) {
        return (
            <main className="calculation-page">
                <div className="calculation-glow" />

                <div className="calculation-empty">
                    <span className="empty-icon">♫</span>
                    <p className="section-eyebrow">RHAPSODY / ANALYSIS</p>
                    <h1>
                        Nothing playing <span>yet.</span>
                    </h1>
                    <p>
                        No statistics were found. Upload your Spotify CSV
                        and select an artist to generate your listening report.
                    </p>

                    <button
                        className="back-button"
                        onClick={() => navigate("/")}
                    >
                        RETURN HOME <span>↗</span>
                    </button>
                </div>
            </main>
        );
    }

    const formatNumber = (value) =>
        value == null ? "N/A" : Number(value).toLocaleString();

    const formatHours = (value) =>
        value == null
            ? "N/A"
            : `${Number(value).toLocaleString()} h`;

    const formatPercent = (value) =>
        value == null ? "N/A" : `${value}%`;

    const timeOfDay = stats.playsByTime || {};

    const totalTimeOfDayPlays = Object.values(timeOfDay).reduce(
        (total, value) => total + (Number(value) || 0),
        0
    );

    return (
        <main className="calculation-page">
            <div className="calculation-glow" />

            <div className="calculation-content">
                <header className="calculation-header">
                    <button
                        className="calculation-brand"
                        onClick={() => navigate("/")}
                    >
                        <span>RHAPSODY</span>
                    </button>

                    <span className="report-status">
                        <span className="status-dot" />
                        LISTENING REPORT
                    </span>
                </header>

                <section className="artist-hero">
                    <p className="section-eyebrow">
                        YOUR LISTENING, DECODED
                    </p>

                    <h1>
                        Artist <span>analysis.</span>
                    </h1>

                    <div className="artist-name-card">
                        <div className="artist-vinyl" aria-hidden="true">
                            <div className="vinyl-center">♫</div>
                        </div>

                        <div className="artist-hero-info">
                            <p className="artist-hero-label">
                                YOUR SELECTED HEADLINER
                            </p>
                            <h2>{selectedArtist}</h2>
                            <p className="artist-hero-caption">
                                A closer look at your listening habits.
                            </p>
                        </div>

                        <div className="artist-hero-badge">✳</div>
                    </div>
                </section>

                <section className="report-section">
                    <div className="section-heading">
                        <div>
                            <p className="section-eyebrow">
                                THE BIG PICTURE
                            </p>
                            <h2>Your listening habits</h2>
                        </div>
                        <span className="section-index">01 / OVERVIEW</span>
                    </div>

                    <div className="stats-grid">
                        <StatCard
                            label="TOTAL LISTENING"
                            value={formatHours(stats.totalHours)}
                            detail="Across your entire history"
                        />

                        <StatCard
                            label="TRACK RECORDS"
                            value={formatNumber(stats.totalPlays)}
                            detail="Records with a track name"
                        />

                        <StatCard
                            label="AVERAGE LISTEN"
                            value={
                                stats.averageSeconds == null
                                    ? "N/A"
                                    : `${stats.averageSeconds}s`
                            }
                            detail="Per recorded track entry"
                        />

                        <StatCard
                            label="OVERALL SKIP RATE"
                            value={formatPercent(stats.skipRate)}
                            detail="Based on valid skip values"
                        />
                    </div>
                </section>

                <section className="report-section">
                    <div className="section-heading">
                        <div>
                            <p className="section-eyebrow">
                                THE MAIN CHARACTER
                            </p>
                            <h2>You and {selectedArtist}</h2>
                        </div>
                        <span className="section-index">02 / ARTIST</span>
                    </div>

                    <div className="artist-stats-grid">
                        <article className="loyalty-card">
                            <p className="stat-label">ARTIST LOYALTY</p>

                            <div className="loyalty-number">
                                {stats.artistLoyalty ?? "N/A"}
                                {stats.artistLoyalty != null && (
                                    <span>%</span>
                                )}
                            </div>

                            <p className="loyalty-description">
                                Share of your total listening time spent
                                with this artist.
                            </p>

                            <div className="loyalty-track">
                                <div
                                    className="loyalty-fill"
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            Math.max(
                                                0,
                                                Number(stats.artistLoyalty) || 0
                                            )
                                        )}%`,
                                    }}
                                />
                            </div>
                        </article>

                        <div className="artist-stat-stack">
                            <StatCard
                                label="TIME WITH THIS ARTIST"
                                value={formatHours(stats.artistHours)}
                            />

                            <StatCard
                                label="TRACK RECORDS"
                                value={formatNumber(stats.artistPlays)}
                            />

                            <StatCard
                                label="ARTIST SKIP RATE"
                                value={formatPercent(stats.artistSkipRate)}
                            />
                        </div>
                    </div>

                    <div className="favourites-grid">
                        <article className="favourite-card">
                            <span className="favourite-icon">♫</span>
                            <div>
                                <p className="stat-label">
                                    YOUR MOST-PLAYED TRACK
                                </p>
                                <h3>
                                    {stats.artistFavouriteSong || "Unknown"}
                                </h3>
                            </div>
                        </article>

                        <article className="favourite-card">
                            <span className="favourite-icon">▤</span>
                            <div>
                                <p className="stat-label">YOUR TOP ALBUM</p>
                                <h3>
                                    {stats.artistFavouriteAlbum || "Unknown"}
                                </h3>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="report-section">
                    <div className="section-heading">
                        <div>
                            <p className="section-eyebrow">OVER TIME</p>
                            <h2>When the music happens</h2>
                        </div>
                        <span className="section-index">03 / TIMELINE</span>
                    </div>

                    <div className="chart-grid">
                        <article className="chart-card">
                            <div className="chart-card-heading">
                                <div>
                                    <h3>Monthly listening</h3>
                                    <p>All artists · hours listened</p>
                                </div>
                                <span className="chart-icon">↗</span>
                            </div>

                            <ListeningBars
                                data={stats.monthlyListening}
                            />
                        </article>

                        <article className="chart-card">
                            <div className="chart-card-heading">
                                <div>
                                    <h3>{selectedArtist}</h3>
                                    <p>Monthly listening · hours</p>
                                </div>
                                <span className="chart-icon">♫</span>
                            </div>

                            <ListeningBars
                                data={stats.artistMonthlyListening}
                            />
                        </article>
                    </div>
                </section>

                <section className="report-section">
                    <div className="section-heading">
                        <div>
                            <p className="section-eyebrow">
                                YOUR DAILY RHYTHM
                            </p>
                            <h2>When you press play</h2>
                        </div>
                        <span className="section-index">
                            04 / TIME OF DAY
                        </span>
                    </div>

                    <article className="chart-card time-chart-card">
                        <div className="chart-card-heading">
                            <div>
                                <h3>Listening by time of day</h3>
                                <p>
                                    {formatNumber(totalTimeOfDayPlays)} recorded
                                    track entries
                                </p>
                            </div>
                            <span className="chart-icon">◷</span>
                        </div>

                        <ListeningBars
                            data={timeOfDay}
                            suffix="plays"
                        />
                    </article>
                </section>

                <section className="report-section">
                    <div className="section-heading">
                        <div>
                            <p className="section-eyebrow">
                                YOUR LISTENING PATTERNS
                            </p>
                            <h2>{selectedArtist}, by the hour</h2>
                        </div>
                        <span className="section-index">
                            05 / LISTENING HEATMAP
                        </span>
                    </div>

                    <article className="chart-card heatmap-chart-card">
                        <div className="chart-card-heading">
                            <div>
                                <h3>When you listen to {selectedArtist}</h3>
                                <p>
                                    Monthly track entries across five
                                    time periods
                                </p>
                            </div>
                            <span className="chart-icon">▦</span>
                        </div>

                        <ListeningHeatmap data={stats.artistHeatmap} />
                    </article>
                </section>

                <section className="versus-prompt-section">
                    <p className="section-eyebrow">
                        THE ULTIMATE SHOWDOWN
                    </p>

                    <h2>
                        Want to make this artist{" "}
                        <span>compete with others?</span>
                    </h2>

                    <p className="versus-prompt-description">
                        Pick another artist and see how your listening habits
                        compare.
                    </p>

                    {opponentArtists.length > 0 ? (
                        <div className="versus-controls">
                            <select
                                className="versus-artist-select"
                                value={opponent}
                                onChange={(event) =>
                                    setOpponent(event.target.value)
                                }
                                aria-label="Select an artist to compete against"
                            >
                                <option value="">
                                    Choose an opponent
                                </option>

                                {opponentArtists.map((artist) => (
                                    <option key={artist} value={artist}>
                                        {artist}
                                    </option>
                                ))}
                            </select>

                            <button
                                className="versus-button"
                                disabled={!opponent}
                                onClick={() =>
                                    navigate("/versus", {
                                        state: {
                                            artist: selectedArtist,
                                            opponent,
                                            artists,
                                        },
                                    })
                                }
                            >
                                VERSUS <span>↗</span>
                            </button>
                        </div>
                    ) : (
                        <p className="versus-prompt-description">
                            No other artists found. Make sure the artist list
                            is passed to this page after uploading your Spotify
                            CSV.
                        </p>
                    )}
                </section>

                <footer className="calculation-footer">
                    <span>RHAPSODY © 2026</span>
                    <span>
                        <span className="footer-dot" />
                        BUILT AROUND YOUR LISTENING HISTORY
                    </span>
                    <button
                        className="footer-back-button"
                        onClick={() => navigate("/")}
                    >
                        BACK HOME ↗
                    </button>
                </footer>
            </div>
        </main>
    );
}

export default CalculationPage;
