import './About.css';

function About() {
    const team = [
        { name: "Anshuman Singh", linkedin: "https://www.linkedin.com/in/anshuretanim" },
        { name: "Anumeet Prakash", linkedin: "https://www.linkedin.com/in/anumeetprakash/" },
        { name: "Aryan Singh", linkedin: "https://www.linkedin.com/in/aryansinghmr/" }
    ];

    return (
        <div className="about-page">
            <div className="about-container">

                <p className="about-label">
                    ♫ THE STORY BEHIND THE SOUND
                </p>

                <h1 className="about-title">
                    Music has a story.
                    <br />
                    <span>We help you find it.</span>
                </h1>

                <p className="about-description">
                    <strong>Rhapsody</strong> is a Spotify music history
                    analyzer and playlist recommendation engine that
                    turns your listening history into meaningful insights.
                    Discover your musical patterns, explore your favorite
                    artists, and find your next favorite song.
                </p>

                <div className="about-divider"></div>

                <section className="about-team">
                    <p className="about-label">
                        THE PEOPLE BEHIND RHAPSODY
                    </p>

                    <div className="team-list">
                        {team.map((member, index) => (
                            <div className="team-member" key={member.name}>
                                <span className="team-number">
                                    0{index + 1}
                                </span>

                                <a
                                    className="team-link"
                                    href={member.linkedin || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`LinkedIn profile of ${member.name}`}
                                >
                                    <h2>{member.name}</h2>
                                </a>

                                <span className="team-arrow">↗</span>
                            </div>
                        ))}
                    </div>
                </section>

                <p className="about-footer">
                    MADE FOR THE LOVE OF MUSIC.
                </p>

            </div>
        </div>
    );
}

export default About;