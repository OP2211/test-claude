"use client";

import "./LandingHome.css";

interface LandingHomeProps {
  onEnterFanGround: () => void;
  onSeeLiveRooms: () => void;
}

function ArrowRushIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function FanShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 5 3.4 8.5 7 10 3.6-1.5 7-5 7-10V6l-7-3z" />
      <path d="M9.5 12.5 11 14l3.5-3.5" />
    </svg>
  );
}

function StadiumIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18" />
      <path d="M5 9v9m14-9v9" />
      <path d="M3 18h18" />
      <path d="m8 9 2-4h4l2 4" />
    </svg>
  );
}

function PredictionBoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 2-7 11h5l-1 9 8-12h-5z" />
    </svg>
  );
}

export default function LandingHome({
  onEnterFanGround,
  onSeeLiveRooms,
}: LandingHomeProps) {
  return (
    <div className="landing">
      {/* 1. Hero */}
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-live-pill" role="status">
              <span className="landing-live-dot" aria-hidden="true" />
              Live every matchday
            </p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Stop Watching Matches Alone.
            </h1>
            <p className="landing-hero-sub">
              Real-time banter, predictions & lineup reactions with football fans worldwide.
            </p>
            <p className="landing-hero-support">
              Live banter. Rival fans. Real-time reactions.
            </p>
            <div className="landing-hero-cta">
              <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={onEnterFanGround}
              >
                <span className="landing-btn-icon" aria-hidden="true"><ArrowRushIcon /></span>
                Enter FanGround
              </button>
              <button
                type="button"
                className="landing-btn landing-btn--secondary"
                onClick={onSeeLiveRooms}
              >
                <span className="landing-btn-icon" aria-hidden="true"><StadiumIcon /></span>
                See Live Rooms
              </button>
            </div>
          </div>
          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-stadium-glow" />
            <div className="landing-chat-mock">
              <div className="landing-chat-header">
                <span className="landing-chat-live">
                  <span className="landing-live-dot" /> LIVE
                </span>
                <span className="landing-chat-title">Match room</span>
              </div>
              <div className="landing-chat-stream">
                <div className="landing-msg landing-msg--blue">
                  What a strike &#128293;
                </div>
                <div className="landing-msg landing-msg--red">
                  VAR checking...
                </div>
                <div className="landing-msg landing-msg--yellow">
                  Called it!
                </div>
                <div className="landing-msg landing-msg--blue">
                  Room is LOUD
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. What is FanGround */}
      <section className="landing-strip" aria-label="Key features">
        <div className="landing-strip-inner">
          <div className="landing-stat">
            <span className="landing-stat-emoji" aria-hidden="true">&#9917;</span>
            <span>Premier League, FA Cup & Champions League</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-emoji" aria-hidden="true">&#128483;&#65039;</span>
            <span>Live banter with rival fans</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-emoji" aria-hidden="true">&#9889;</span>
            <span>Predictions that lock before kickoff</span>
          </div>
        </div>
      </section>

      <div className="landing-cta-band">
        <button
          type="button"
          className="landing-btn landing-btn--primary landing-btn--compact"
          onClick={onSeeLiveRooms}
        >
          <span className="landing-btn-icon" aria-hidden="true"><ArrowRushIcon /></span>
          Join a match room
        </button>
      </div>

      {/* 3. Problem */}
      <section className="landing-section" aria-labelledby="landing-problem-title">
        <h2 id="landing-problem-title" className="landing-section-title">
          Sound familiar?
        </h2>
        <div className="landing-problem-grid">
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Twitter / X</h3>
            <p className="landing-card-body">
              Everyone has a hot take. No one is watching <em>your</em> match with you.
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">WhatsApp</h3>
            <p className="landing-card-body">
              Same mates, same group. Where are the rival fans to banter with?
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Reddit</h3>
            <p className="landing-card-body">
              Match threads are massive walls of text. The live moment is already gone.
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Solo viewing</h3>
            <p className="landing-card-body">
              90th minute equaliser. You jump off the sofa. But there&apos;s no crowd next to you.
            </p>
          </article>
        </div>
        <p className="landing-closing-line">
          You&apos;re reacting... but no one&apos;s reacting with you.
        </p>
      </section>

      {/* 4. Solution */}
      <section className="landing-section landing-section--glow" aria-labelledby="landing-solution-title">
        <h2 id="landing-solution-title" className="landing-section-title">
          FanGround is the crowd
        </h2>
        <ul className="landing-bullet-list">
          <li>Live match rooms that open 2 hours before kickoff</li>
          <li>Home fans vs away fans in the same room</li>
          <li>Color-coded messages so you know who&apos;s who</li>
          <li>Predict the score, predict the winner</li>
          <li>React to lineups, subs, and goals in real time</li>
        </ul>
        <p className="landing-highlight">
          When a goal goes in &mdash; the room explodes.
        </p>
      </section>

      <div className="landing-cta-band">
        <button
          type="button"
          className="landing-btn landing-btn--primary landing-btn--compact"
          onClick={onEnterFanGround}
        >
          <span className="landing-btn-icon" aria-hidden="true"><ArrowRushIcon /></span>
          Feel the next match
        </button>
      </div>

      {/* 5. Core features */}
      <section className="landing-section" aria-labelledby="landing-features-title">
        <h2 id="landing-features-title" className="landing-section-title">
          The experience
        </h2>
        <div className="landing-features">
          <article className="landing-feature">
            <h3 className="landing-feature-title">
              <span className="landing-feature-title-icon" aria-hidden="true"><FanShieldIcon /></span>
              Fan identity
            </h3>
            <ul className="landing-feature-list">
              <li>Pick your Premier League club</li>
              <li>Your messages carry your team colours</li>
              <li>Everyone knows whose side you&apos;re on</li>
            </ul>
          </article>
          <article className="landing-feature">
            <h3 className="landing-feature-title">
              <span className="landing-feature-title-icon" aria-hidden="true"><StadiumIcon /></span>
              Match rooms
            </h3>
            <ul className="landing-feature-list">
              <li>Pre-match build-up, live chat, post-match analysis</li>
              <li>Real lineups from ESPN</li>
              <li>Live scores updating every 30 seconds</li>
            </ul>
          </article>
          <article className="landing-feature">
            <h3 className="landing-feature-title">
              <span className="landing-feature-title-icon" aria-hidden="true"><PredictionBoltIcon /></span>
              Predictions
            </h3>
            <ul className="landing-feature-list">
              <li>Pick the winner before kickoff</li>
              <li>Predict the exact scoreline</li>
              <li>Locked once confirmed &mdash; no changing your mind</li>
            </ul>
          </article>
        </div>
      </section>

      {/* 6. Emotional */}
      <section className="landing-section landing-emotional" aria-labelledby="landing-moment-title">
        <h2 id="landing-moment-title" className="landing-section-title">
          Inside the moment
        </h2>
        <p className="landing-emotional-lead">
          300 fans. 89th minute. Corner kick. Header. GOAL.
        </p>
        <p className="landing-emotional-boom">The room explodes.</p>
        <p className="landing-emotional-close">
          You&apos;re not watching anymore.
          <br />
          You&apos;re inside the moment.
        </p>
      </section>

      <div className="landing-cta-band">
        <button
          type="button"
          className="landing-btn landing-btn--secondary landing-btn--compact"
          onClick={onSeeLiveRooms}
        >
          <span className="landing-btn-icon" aria-hidden="true"><StadiumIcon /></span>
          See live match rooms
        </button>
      </div>

      {/* 7. Comparison */}
      <section className="landing-section" aria-labelledby="landing-compare-title">
        <h2 id="landing-compare-title" className="landing-section-title">
          Why it&apos;s different
        </h2>
        <div className="landing-table-wrap">
          <table className="landing-table">
            <thead>
              <tr>
                <th scope="col">Others</th>
                <th scope="col">FanGround</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="landing-table-row-label">Scroll a feed</span></td>
                <td><span className="landing-table-win">Live match room</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">No team identity</span></td>
                <td><span className="landing-table-win">Your club, your colours</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Delayed threads</span></td>
                <td><span className="landing-table-win">Real-time reactions</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Echo chamber</span></td>
                <td><span className="landing-table-win">Rival fans in one room</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Watching alone</span></td>
                <td><span className="landing-table-win">Feeling it together</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. Audience */}
      <section className="landing-section landing-audience" aria-labelledby="landing-audience-title">
        <h2 id="landing-audience-title" className="landing-section-title">
          Built for real football fans
        </h2>
        <div className="landing-audience-cols">
          <div>
            <h3 className="landing-audience-sub">This is for you if</h3>
            <ul className="landing-audience-list landing-audience-list--in">
              <li>You live for matchdays</li>
              <li>You argue about lineups and formations</li>
              <li>You need someone to celebrate (or rant) with</li>
            </ul>
          </div>
          <div>
            <h3 className="landing-audience-sub">Not for</h3>
            <ul className="landing-audience-list landing-audience-list--out">
              <li>Casual viewers who check scores later</li>
              <li>People looking for a news app</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="landing-final" aria-labelledby="landing-final-title">
        <h2 id="landing-final-title" className="landing-final-title">
          The next match is coming.
        </h2>
        <p className="landing-final-sub">Don&apos;t watch it alone.</p>
        <div className="landing-final-cta">
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={onSeeLiveRooms}
          >
            <span className="landing-btn-icon" aria-hidden="true"><ArrowRushIcon /></span>
            Join the Next Match Room
          </button>
          <button
            type="button"
            className="landing-btn landing-btn--secondary"
            onClick={onEnterFanGround}
          >
            <span className="landing-btn-icon" aria-hidden="true"><FanShieldIcon /></span>
            Pick Your Club
          </button>
        </div>
        <p className="landing-tagline">FanGround &mdash; Where Fans Feel the Match</p>
      </section>

      <div className="landing-sticky">
        <button
          type="button"
          className="landing-btn landing-btn--primary"
          onClick={onSeeLiveRooms}
        >
          <span className="landing-btn-icon" aria-hidden="true"><ArrowRushIcon /></span>
          Join the next match room
        </button>
      </div>
    </div>
  );
}
