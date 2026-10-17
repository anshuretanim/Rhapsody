import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const tableCellStyle = {
    padding: "15px 12px",
    borderBottom: "1px solid #292929",
    overflowWrap: "anywhere",
};

function Versus() {
    const location = useLocation();
    const navigate = useNavigate();

    const artist = location.state?.artist;
    const opponent = location.state?.opponent;

    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!artist || !opponent) {
            setError(
                "Artist information is missing. Please return to your report and select both artists."
            );
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchComparison() {
            setLoading(true);
            setError("");
            setComparison(null);

            try {
                const response = await fetch(
                    "http://localhost:5000/versus",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            artist,
                            opponent,
                        }),
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    if (result.details) {
                        console.error("R details:", result.details);
                    }

                    throw new Error(
                        result.error || "Could not calculate the comparison."
                    );
                }

                if (!cancelled) {
                    setComparison(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message ||
                            "Something went wrong while comparing the artists."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchComparison();

        return () => {
            cancelled = true;
        };
    }, [artist, opponent]);

    const monthlyData = comparison?.correlationMonthly || [];
    const correlation = comparison?.correlation;

    const predictions = comparison?.listeningPredictions;

    const artistPrediction = predictions?.selectedArtist;
    const opponentPrediction = predictions?.opponentArtist;

    function getCorrelationLabel(value) {
        if (value === null || value === undefined) {
            return "Not enough variation to calculate";
        }

        if (value >= 0.7) {
            return "Strong positive relationship";
        }

        if (value >= 0.3) {
            return "Moderate positive relationship";
        }

        if (value > -0.3) {
            return "Little or no linear relationship";
        }

        if (value > -0.7) {
            return "Moderate negative relationship";
        }

        return "Strong negative relationship";
    }

    // Accepts "YYYY-MM" (or "YYYY-MM-DD") and returns e.g. "January 2027"
    function formatMonth(month) {
        if (!month) return "Unknown month";

        const [year, monthNumber] = month.split("-").map(Number);

        return new Date(
            Date.UTC(year, monthNumber - 1, 1)
        ).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        });
    }

    function formatHours(value) {
        return Number(value).toLocaleString("en-US", {
            maximumFractionDigits: 2,
        });
    }

    function formatProbability(value) {
        if (
            value === null ||
            value === undefined ||
            !Number.isFinite(Number(value))
        ) {
            return "N/A";
        }

        return `${(Number(value) * 100).toFixed(1)}%`;
    }

    function getPredictionDescription(prediction) {
        if (!prediction) {
            return "Prediction data is unavailable.";
        }

        if (prediction.conditionalSource === "historical_fallback") {
            return "No matching previous-month transitions were available. The historical frequency is used as a fallback.";
        }

        const status = prediction.lastMonthListened
            ? "you listened"
            : "you did not listen";

        return `Based on ${prediction.transitionCount} past month-to-month transitions that started from a month where ${status} (like your latest month). You listened in the following month ${prediction.transitionSuccesses} of those times.`;
    }

    const chartWidth = 760;
    const chartHeight = 460;

    const plotLeft = 80;
    const plotRight = 725;
    const plotTop = 30;
    const plotBottom = 370;

    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const maxHours = Math.max(
        1,
        ...monthlyData.map((item) =>
            Math.max(
                Number(item.artistHours) || 0,
                Number(item.opponentHours) || 0
            )
        )
    );

    const axisMax = Math.ceil(maxHours * 1.1);
    const tickCount = 5;

    const xPosition = (hours) =>
        plotLeft + (hours / axisMax) * plotWidth;

    const yPosition = (hours) =>
        plotBottom - (hours / axisMax) * plotHeight;

    const axisTicks = Array.from(
        { length: tickCount + 1 },
        (_, index) => (axisMax / tickCount) * index
    );

    const pageStyle = {
        minHeight: "100vh",
        background: "#090909",
        color: "#f5f5f5",
        padding: "36px 20px 60px",
        boxSizing: "border-box",
        fontFamily: "Manrope, sans-serif",
    };

    const containerStyle = {
        width: "100%",
        maxWidth: "1050px",
        margin: "0 auto",
    };

    const panelStyle = {
        background: "linear-gradient(145deg, #171717, #101010)",
        border: "1px solid #292929",
        borderRadius: "16px",
        padding: "clamp(18px, 4vw, 36px)",
        marginTop: "24px",
    };

    const buttonStyle = {
        background: "#1ed760",
        color: "#090909",
        border: "none",
        borderRadius: "8px",
        padding: "12px 18px",
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "1px",
        cursor: "pointer",
    };

    function ProbabilityRow({ label, description, value }) {
        const valid =
            value !== null &&
            value !== undefined &&
            Number.isFinite(Number(value));

        const percentage = valid
            ? Math.min(100, Math.max(0, Number(value) * 100))
            : 0;

        return (
            <div
                style={{
                    padding: "18px 0",
                    borderBottom: "1px solid #292929",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                            style={{
                                fontSize: "14px",
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {label}
                        </h4>

                        <p
                            style={{
                                color: "#999",
                                fontSize: "12px",
                                lineHeight: 1.6,
                                margin: "5px 0 0",
                            }}
                        >
                            {description}
                        </p>
                    </div>

                    <span
                        style={{
                            fontSize: "22px",
                            fontWeight: 900,
                            color: valid ? "#1ed760" : "#777",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {formatProbability(value)}
                    </span>
                </div>

                <div
                    style={{
                        height: "5px",
                        borderRadius: "10px",
                        background: "#292929",
                        marginTop: "14px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${percentage}%`,
                            background: "#1ed760",
                            borderRadius: "10px",
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>
            </div>
        );
    }

    function PredictionCard({ prediction, fallbackArtist }) {
        const predictionArtist = prediction?.artist || fallbackArtist;

        return (
            <article
                style={{
                    background: "#111",
                    border: "1px solid #292929",
                    borderRadius: "14px",
                    padding: "clamp(16px, 3vw, 26px)",
                    minWidth: 0,
                }}
            >
                <p
                    style={{
                        color: "#1ed760",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "2px",
                        margin: 0,
                    }}
                >
                    RHAPSODY · LISTENING PREDICTION
                </p>

                <h3
                    style={{
                        fontSize: "clamp(19px, 3vw, 25px)",
                        fontWeight: 900,
                        margin: "16px 0 6px",
                        overflowWrap: "anywhere",
                    }}
                >
                    {predictionArtist}
                </h3>

                <p
                    style={{
                        color: "#999",
                        fontSize: "12px",
                        margin: "0 0 20px",
                    }}
                >
                    {prediction?.predictionMonth
                        ? `Prediction for ${formatMonth(
                              prediction.predictionMonth
                          )}`
                        : "Next-month prediction"}
                </p>

                <div
                    style={{
                        background: "#191919",
                        borderRadius: "10px",
                        padding: "18px",
                        marginBottom: "8px",
                    }}
                >
                    <p
                        style={{
                            color: "#999",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "1px",
                            margin: 0,
                        }}
                    >
                        BAYESIAN PREDICTION
                    </p>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            flexWrap: "wrap",
                            gap: "8px",
                            marginTop: "8px",
                        }}
                    >
                        <span
                            style={{
                                color: "#1ed760",
                                fontSize: "clamp(34px, 6vw, 46px)",
                                fontWeight: 900,
                                letterSpacing: "-2px",
                            }}
                        >
                            {formatProbability(
                                prediction?.bayesianProbability
                            )}
                        </span>

                        <span
                            style={{
                                color: "#aaa",
                                fontSize: "12px",
                            }}
                        >
                            predicted probability
                        </span>
                    </div>
                </div>

                <ProbabilityRow
                    label="Historical listening frequency"
                    description="Fraction of observed months in which you listened to this artist."
                    value={prediction?.historicalProbability}
                />

                <ProbabilityRow
                    label="Conditional probability estimate"
                    description="Probability based on the previous month's listening status."
                    value={prediction?.conditionalProbability}
                />

                <ProbabilityRow
                    label="Bayesian estimate"
                    description="Posterior predictive probability using a Beta(1, 1) prior."
                    value={prediction?.bayesianProbability}
                />

                <div
                    style={{
                        marginTop: "18px",
                        padding: "12px",
                        background: "#191919",
                        borderRadius: "8px",
                        color: "#999",
                        fontSize: "11px",
                        lineHeight: 1.7,
                    }}
                >
                    <p style={{ margin: 0 }}>
                        <strong style={{ color: "#ddd" }}>
                            Listening history:
                        </strong>{" "}
                        {prediction
                            ? `${prediction.monthsListened} out of ${prediction.monthsObserved} observed months`
                            : "Unavailable"}
                    </p>

                    <p style={{ margin: "7px 0 0" }}>
                        {getPredictionDescription(prediction)}
                    </p>
                </div>
            </article>
        );
    }

    return (
        <main style={pageStyle}>
            <div style={containerStyle}>
                <button
                    style={{
                        ...buttonStyle,
                        background: "transparent",
                        color: "#1ed760",
                        border: "1px solid #333",
                    }}
                    onClick={() => navigate(-1)}
                >
                    ← BACK TO REPORT
                </button>

                <header
                    style={{
                        textAlign: "center",
                        padding: "48px 0 20px",
                    }}
                >
                    <p
                        style={{
                            color: "#1ed760",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "3px",
                        }}
                    >
                        THE ULTIMATE SHOWDOWN
                    </p>

                    <h1
                        style={{
                            fontSize: "clamp(30px, 6vw, 54px)",
                            fontWeight: 800,
                            letterSpacing: "-2px",
                            lineHeight: 1.15,
                            overflowWrap: "anywhere",
                        }}
                    >
                        ARTIST <span style={{ color: "#1ed760" }}>VS</span>{" "}
                        ARTIST
                    </h1>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexWrap: "wrap",
                            gap: "14px",
                            marginTop: "24px",
                        }}
                    >
                        <div
                            style={{
                                padding: "14px 20px",
                                border: "1px solid #333",
                                borderRadius: "10px",
                                background: "#151515",
                                maxWidth: "100%",
                                overflowWrap: "anywhere",
                                fontWeight: 700,
                            }}
                        >
                            {artist || "Artist A"}
                        </div>

                        <span
                            style={{
                                color: "#1ed760",
                                fontSize: "20px",
                                fontWeight: 900,
                            }}
                        >
                            VS
                        </span>

                        <div
                            style={{
                                padding: "14px 20px",
                                border: "1px solid #333",
                                borderRadius: "10px",
                                background: "#151515",
                                maxWidth: "100%",
                                overflowWrap: "anywhere",
                                fontWeight: 700,
                            }}
                        >
                            {opponent || "Artist B"}
                        </div>
                    </div>
                </header>

                {loading && (
                    <section
                        style={{
                            ...panelStyle,
                            textAlign: "center",
                            padding: "60px 20px",
                        }}
                    >
                        <div
                            style={{
                                color: "#1ed760",
                                fontSize: "32px",
                                marginBottom: "16px",
                            }}
                        >
                            ♪
                        </div>

                        <h2>Analyzing your listening history...</h2>

                        <p style={{ color: "#999", lineHeight: 1.7 }}>
                            Calculating correlation, historical listening
                            probabilities, conditional probabilities, and
                            Bayesian estimates.
                        </p>
                    </section>
                )}

                {!loading && error && (
                    <section
                        style={{
                            ...panelStyle,
                            textAlign: "center",
                        }}
                    >
                        <h2 style={{ color: "#ff7777" }}>
                            Comparison failed
                        </h2>

                        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
                            {error}
                        </p>

                        <button
                            style={buttonStyle}
                            onClick={() => navigate(-1)}
                        >
                            RETURN TO REPORT
                        </button>
                    </section>
                )}

                {!loading && !error && comparison && (
                    <>
                        <section style={panelStyle}>
                            <p
                                style={{
                                    color: "#999",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    letterSpacing: "2px",
                                }}
                            >
                                PEARSON CORRELATION COEFFICIENT
                            </p>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: "20px",
                                    marginTop: "18px",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: "clamp(42px, 9vw, 72px)",
                                            fontWeight: 900,
                                            letterSpacing: "-3px",
                                            color:
                                                correlation == null
                                                    ? "#888"
                                                    : correlation > 0
                                                      ? "#1ed760"
                                                      : correlation < 0
                                                        ? "#ff7777"
                                                        : "#f5f5f5",
                                        }}
                                    >
                                        {correlation == null
                                            ? "N/A"
                                            : Number(correlation).toFixed(4)}
                                    </div>

                                    <p
                                        style={{
                                            color: "#ddd",
                                            fontSize: "16px",
                                            fontWeight: 700,
                                            marginTop: "4px",
                                        }}
                                    >
                                        {getCorrelationLabel(correlation)}
                                    </p>
                                </div>

                                <div
                                    style={{
                                        color: "#888",
                                        fontSize: "13px",
                                        lineHeight: 1.8,
                                        maxWidth: "340px",
                                    }}
                                >
                                    Pearson's r measures how closely the
                                    artists' monthly listening hours follow a
                                    linear relationship. It does not measure
                                    causation.
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: "28px",
                                    height: "8px",
                                    borderRadius: "10px",
                                    background:
                                        "linear-gradient(to right, #ff7777, #777, #1ed760)",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        left:
                                            correlation == null
                                                ? "50%"
                                                : `${
                                                      ((Number(correlation) + 1) /
                                                          2) *
                                                      100
                                                  }%`,
                                        top: "-5px",
                                        width: "4px",
                                        height: "18px",
                                        borderRadius: "3px",
                                        background: "#fff",
                                        transform: "translateX(-50%)",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    color: "#888",
                                    fontSize: "11px",
                                    marginTop: "10px",
                                    gap: "8px",
                                }}
                            >
                                <span>-1 · Negative</span>
                                <span>0 · No linear relationship</span>
                                <span>+1 · Positive</span>
                            </div>
                        </section>

                        <section style={panelStyle}>
                            <h2
                                style={{
                                    fontSize: "22px",
                                    fontWeight: 800,
                                    marginTop: 0,
                                }}
                            >
                                Monthly listening correlation
                            </h2>

                            <p
                                style={{
                                    color: "#999",
                                    fontSize: "13px",
                                    lineHeight: 1.7,
                                    marginBottom: "26px",
                                }}
                            >
                                Each dot represents one month. Months with
                                higher values for both artists appear toward
                                the top-right of the graph.
                            </p>

                            {monthlyData.length === 0 ? (
                                <p style={{ color: "#999" }}>
                                    No monthly comparison data is available.
                                </p>
                            ) : (
                                <>
                                    <div
                                        style={{
                                            width: "100%",
                                            overflowX: "auto",
                                        }}
                                    >
                                        <svg
                                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                            role="img"
                                            aria-label={`Scatter plot comparing monthly listening hours for ${artist} and ${opponent}`}
                                            style={{
                                                width: "100%",
                                                minWidth: "320px",
                                                display: "block",
                                                overflow: "visible",
                                            }}
                                        >
                                            {axisTicks.map((tick, index) => (
                                                <g key={index}>
                                                    <line
                                                        x1={plotLeft}
                                                        y1={yPosition(tick)}
                                                        x2={plotRight}
                                                        y2={yPosition(tick)}
                                                        stroke="#292929"
                                                        strokeWidth="1"
                                                    />

                                                    <line
                                                        x1={xPosition(tick)}
                                                        y1={plotTop}
                                                        x2={xPosition(tick)}
                                                        y2={plotBottom}
                                                        stroke="#242424"
                                                        strokeWidth="1"
                                                    />

                                                    <text
                                                        x={plotLeft - 12}
                                                        y={yPosition(tick) + 4}
                                                        fill="#999"
                                                        fontSize="11"
                                                        textAnchor="end"
                                                    >
                                                        {formatHours(tick)}
                                                    </text>

                                                    <text
                                                        x={xPosition(tick)}
                                                        y={plotBottom + 22}
                                                        fill="#999"
                                                        fontSize="11"
                                                        textAnchor="middle"
                                                    >
                                                        {formatHours(tick)}
                                                    </text>
                                                </g>
                                            ))}

                                            <line
                                                x1={plotLeft}
                                                y1={plotTop}
                                                x2={plotLeft}
                                                y2={plotBottom}
                                                stroke="#666"
                                            />

                                            <line
                                                x1={plotLeft}
                                                y1={plotBottom}
                                                x2={plotRight}
                                                y2={plotBottom}
                                                stroke="#666"
                                            />

                                            {monthlyData.map((item) => (
                                                <circle
                                                    key={item.month}
                                                    cx={xPosition(
                                                        Number(item.artistHours) || 0
                                                    )}
                                                    cy={yPosition(
                                                        Number(item.opponentHours) || 0
                                                    )}
                                                    r="5"
                                                    fill="#1ed760"
                                                    stroke="#090909"
                                                    strokeWidth="1.5"
                                                >
                                                    <title>
                                                        {formatMonth(item.month)}
                                                        {" | "}
                                                        {artist}:{" "}
                                                        {formatHours(item.artistHours)}{" "}
                                                        hours
                                                        {" | "}
                                                        {opponent}:{" "}
                                                        {formatHours(item.opponentHours)}{" "}
                                                        hours
                                                    </title>
                                                </circle>
                                            ))}

                                            <text
                                                x={(plotLeft + plotRight) / 2}
                                                y={chartHeight - 12}
                                                fill="#f5f5f5"
                                                fontSize="12"
                                                textAnchor="middle"
                                                fontWeight="600"
                                            >
                                                {artist} (hours)
                                            </text>

                                            <text
                                                x="20"
                                                y={(plotTop + plotBottom) / 2}
                                                fill="#f5f5f5"
                                                fontSize="12"
                                                textAnchor="middle"
                                                fontWeight="600"
                                                transform={`rotate(-90 20 ${
                                                    (plotTop + plotBottom) / 2
                                                })`}
                                            >
                                                {opponent} (hours)
                                            </text>
                                        </svg>
                                    </div>

                                    <p
                                        style={{
                                            color: "#777",
                                            fontSize: "12px",
                                            lineHeight: 1.7,
                                            marginTop: "18px",
                                        }}
                                    >
                                        Each point represents a month. The
                                        tooltip shows the month and listening
                                        hours for both artists.
                                    </p>
                                </>
                            )}
                        </section>

                        <section style={panelStyle}>
                            <h2
                                style={{
                                    fontSize: "22px",
                                    fontWeight: 800,
                                    marginTop: 0,
                                }}
                            >
                                Monthly breakdown
                            </h2>

                            <p
                                style={{
                                    color: "#999",
                                    fontSize: "13px",
                                    lineHeight: 1.7,
                                }}
                            >
                                Listening hours for both artists, month by
                                month.
                            </p>

                            <div
                                style={{
                                    width: "100%",
                                    overflowX: "auto",
                                    marginTop: "20px",
                                }}
                            >
                                <table
                                    style={{
                                        width: "100%",
                                        minWidth: "430px",
                                        borderCollapse: "collapse",
                                        textAlign: "left",
                                        fontSize: "13px",
                                    }}
                                >
                                    <thead>
                                        <tr style={{ color: "#999" }}>
                                            <th style={tableCellStyle}>
                                                Month
                                            </th>
                                            <th style={tableCellStyle}>
                                                {artist}
                                            </th>
                                            <th style={tableCellStyle}>
                                                {opponent}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {monthlyData.map((item) => (
                                            <tr key={item.month}>
                                                <td style={tableCellStyle}>
                                                    {formatMonth(item.month)}
                                                </td>
                                                <td
                                                    style={{
                                                        ...tableCellStyle,
                                                        color: "#1ed760",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {formatHours(item.artistHours)} h
                                                </td>
                                                <td
                                                    style={{
                                                        ...tableCellStyle,
                                                        color: "#f5f5f5",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {formatHours(item.opponentHours)} h
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section style={panelStyle}>
                            <div style={{ marginBottom: "26px" }}>
                                <p
                                    style={{
                                        color: "#1ed760",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        letterSpacing: "2px",
                                        margin: "0 0 10px",
                                    }}
                                >
                                    PROBABILITY & STATISTICS
                                </p>

                                <h2
                                    style={{
                                        fontSize: "clamp(23px, 4vw, 30px)",
                                        fontWeight: 900,
                                        margin: 0,
                                    }}
                                >
                                    Who will you listen to next month?
                                </h2>

                                <p
                                    style={{
                                        color: "#999",
                                        fontSize: "13px",
                                        lineHeight: 1.8,
                                        maxWidth: "720px",
                                        marginBottom: 0,
                                    }}
                                >
                                    Each artist is evaluated independently using
                                    historical frequency, conditional
                                    probability, and Bayes' theorem. The
                                    estimates describe whether you will listen
                                    to an artist at least once (a play of 30
                                    seconds or more) during the predicted
                                    month.
                                </p>
                            </div>

                            {predictions ? (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                                        gap: "18px",
                                    }}
                                >
                                    <PredictionCard
                                        prediction={artistPrediction}
                                        fallbackArtist={artist}
                                    />

                                    <PredictionCard
                                        prediction={opponentPrediction}
                                        fallbackArtist={opponent}
                                    />
                                </div>
                            ) : (
                                <div
                                    style={{
                                        padding: "22px",
                                        background: "#111",
                                        border: "1px solid #292929",
                                        borderRadius: "10px",
                                        color: "#aaa",
                                        lineHeight: 1.7,
                                        fontSize: "13px",
                                    }}
                                >
                                    Prediction data was not included in the
                                    server response. Update the backend to
                                    return the listeningPredictions object
                                    generated by the R script.
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: "22px",
                                    color: "#777",
                                    fontSize: "12px",
                                    lineHeight: 1.8,
                                }}
                            >
                                <p>
                                    <strong style={{ color: "#bbb" }}>
                                        Historical probability:
                                    </strong>{" "}
                                    the fraction of observed months in which
                                    you listened to the artist.
                                </p>

                                <p>
                                    <strong style={{ color: "#bbb" }}>
                                        Conditional probability:
                                    </strong>{" "}
                                    uses the previous month's listening status
                                    to estimate the probability for the next
                                    month.
                                </p>

                                <p>
                                    <strong style={{ color: "#bbb" }}>
                                        Bayesian estimate:
                                    </strong>{" "}
                                    uses a Beta(1, 1) prior and the observed
                                    listening and non-listening months to
                                    calculate a posterior predictive
                                    probability.
                                </p>

                                <p>
                                    These estimates use different assumptions
                                    and are not averaged together. They are
                                    estimates based on past behaviour, not
                                    guarantees of future listening.
                                </p>
                            </div>
                        </section>

                        <section
                            style={{
                                textAlign: "center",
                                padding: "32px 10px 10px",
                                color: "#888",
                                fontSize: "12px",
                                lineHeight: 1.8,
                            }}
                        >
                            <p>
                                Correlation is not causation. Two artists'
                                listening patterns can move together without
                                either one causing the other.
                            </p>

                            <button
                                style={{
                                    ...buttonStyle,
                                    marginTop: "18px",
                                }}
                                onClick={() => navigate(-1)}
                            >
                                BACK TO YOUR REPORT
                            </button>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

export default Versus;