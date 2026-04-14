"use client";

import WaitlistSection from "@/components/WaitlistSection";
import "./LandingHome.css";

interface LandingHomeProps {
  onEnterFanGround: () => void;
  onSeeLiveRooms: () => void;
}

function SecondScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="9" y1="17" x2="15" y2="17" />
      <circle cx="12" cy="7.5" r="1.5" />
    </svg>
  );
}

function MatchChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

function CrowdIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="8" r="2" />
      <circle cx="17" cy="8" r="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 18c.3-2 2-3.5 4-3.5h.5M20.5 18c-.3-2-2-3.5-4-3.5H16M7.5 18c.4-2.4 2.3-4 4.5-4s4.1 1.6 4.5 4" />
    </svg>
  );
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
        {/* Waitlist — after full story; captures scanners who aren’t ready to jump in */}
       
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-live-pill" role="status">
              <span className="landing-live-dot" aria-hidden="true" />
              Built for live matches
            </p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Stop Watching Matches Alone.
            </h1>
            <p className="landing-hero-sub">
              This is where fans come to feel the game.
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
                See Live Match Rooms
              </button>
            </div>
            <p className="landing-hero-tertiary">
              <a href="#waitlist" className="landing-hero-waitlist-link">
                Get launch & feature updates
              </a>
              <span className="landing-hero-tertiary-sep" aria-hidden="true">
                ·
              </span>
              <span className="landing-hero-tertiary-hint">No spam</span>
            </p>
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
                  What a strike 🔥
                </div>
                <div className="landing-msg landing-msg--red">
                  VAR checking…
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

      {/* 2. Social proof */}
      <section className="landing-strip" aria-label="Fan behavior stats">
        <div className="landing-strip-inner">
          <div className="landing-stat">
            <span className="landing-stat-icon" aria-hidden="true">
              <SecondScreenIcon />
            </span>
            <span>90%+ fans use second screen</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-icon" aria-hidden="true">
              <MatchChatIcon />
            </span>
            <span>79% discuss matches live</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-icon" aria-hidden="true">
              <CrowdIcon />
            </span>
            <span>Now there&apos;s a place built for it</span>
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
      
       <div className="landing-waitlist-wrap">
          <WaitlistSection className="wl--landing" />
        </div>
      {/* 3. Problem */}
      <section
        className="landing-section"
        aria-labelledby="landing-problem-title"
      >
        <h2 id="landing-problem-title" className="landing-section-title">
          Sound familiar?
        </h2>
        <div className="landing-problem-grid">
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Twitter</h3>
            <p className="landing-card-body">
              Your feed is everyone’s hot take — not a single crowd for{" "}
              <em>this</em> game.
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">WhatsApp</h3>
            <p className="landing-card-body">
              Same friends, same groups. Rival fans aren’t in the room to
              banter.
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Reddit</h3>
            <p className="landing-card-body">
              Match threads move at forum speed — the live moment is already
              gone.
            </p>
          </article>
          <article className="landing-card landing-card--problem">
            <h3 className="landing-card-label">Solo viewing</h3>
            <p className="landing-card-body">
              You feel the goal — but there’s no crowd next to you to feel it
              with.
            </p>
          </article>
        </div>
        <p className="landing-closing-line">
          You&apos;re reacting… but no one&apos;s reacting with you.
        </p>
      </section>

      {/* 4. Solution */}
      <section
        className="landing-section landing-section--glow"
        aria-labelledby="landing-solution-title"
      >
        <h2 id="landing-solution-title" className="landing-section-title">
          FanGround is the crowd
        </h2>
        <ul className="landing-bullet-list">
          <li>Live match rooms</li>
          <li>Fans from both teams</li>
          <li>Color-coded messages</li>
          <li>Real-time reactions</li>
        </ul>
        <p className="landing-highlight">
          When a goal happens — the room explodes.
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
      <section
        className="landing-section"
        aria-labelledby="landing-features-title"
      >
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
              <li>Pick your team once</li>
              <li>Permanent identity</li>
              <li>Color-coded messages</li>
            </ul>
            <p className="landing-feature-line">
              You&apos;re not anonymous. You represent your team.
            </p>
          </article>
          <article className="landing-feature">
            <h3 className="landing-feature-title">
              <span className="landing-feature-title-icon" aria-hidden="true"><StadiumIcon /></span>
              Match rooms
            </h3>
            <ul className="landing-feature-list">
              <li>Pre-match → live → post-match</li>
              <li>Real-time chat</li>
              <li>Active fan count</li>
            </ul>
            <p className="landing-feature-line">
              This isn&apos;t a feed. It&apos;s a crowd.
            </p>
          </article>
          <article className="landing-feature">
            <h3 className="landing-feature-title">
              <span className="landing-feature-title-icon" aria-hidden="true"><PredictionBoltIcon /></span>
              Predictions
            </h3>
            <ul className="landing-feature-list">
              <li>Match outcome</li>
              <li>Scoreline</li>
              <li>First scorer</li>
            </ul>
            <p className="landing-feature-line">Prove you knew it.</p>
          </article>
        </div>
      </section>

      {/* 6. Emotional */}
      <section
        className="landing-section landing-emotional"
        aria-labelledby="landing-moment-title"
      >
        <h2 id="landing-moment-title" className="landing-section-title">
          Inside the moment
        </h2>
        <p className="landing-emotional-lead">
          300 fans. Last minute. Last over. A goal. A wicket.
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
      <section
        className="landing-section"
        aria-labelledby="landing-compare-title"
      >
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
                <td><span className="landing-table-row-label">Passive</span></td>
                <td><span className="landing-table-win">Active</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">No identity</span></td>
                <td><span className="landing-table-win">Team identity</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Fragmented</span></td>
                <td><span className="landing-table-win">Match-based</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Slow</span></td>
                <td><span className="landing-table-win">Real-time</span></td>
              </tr>
              <tr>
                <td><span className="landing-table-row-label">Alone</span></td>
                <td><span className="landing-table-win">Together</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="landing-table-note">Same match. More energy. Better banter.</p>
      </section>

      {/* 8. Audience */}
      <section
        className="landing-section landing-audience"
        aria-labelledby="landing-audience-title"
      >
        <h2 id="landing-audience-title" className="landing-section-title">
          For real fans only
        </h2>
        <div className="landing-audience-cols">
          <div>
            <h3 className="landing-audience-sub">This is for you if</h3>
            <ul className="landing-audience-list landing-audience-list--in">
              <li>IPL / EPL fans</li>
              <li>You argue, react, and predict</li>
            </ul>
          </div>
          <div>
            <h3 className="landing-audience-sub">Not for</h3>
            <ul className="landing-audience-list landing-audience-list--out">
              <li>Casual viewers</li>
              <li>News readers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 9. What it&apos;s not */}
      <section className="landing-section" aria-labelledby="landing-not-title">
        <h2 id="landing-not-title" className="landing-section-title">
          What it&apos;s not
        </h2>
        <ul className="landing-not-list">
          <li>Not a scores app</li>
          <li>Not a news app</li>
          <li>Not a fantasy app</li>
        </ul>
      </section>

      {/* 10. Final CTA */}
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
            Start Your Fan Identity
          </button>
        </div>
        <p className="landing-tagline">FanGround — Where Fans Feel the Match</p>
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
       <div className="landing-waitlist-wrap">
          <WaitlistSection className="wl--landing" />
        </div>
    </div>
  );
}
