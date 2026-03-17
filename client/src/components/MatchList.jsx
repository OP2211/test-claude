import React, { useState, useEffect } from 'react';
import './MatchList.css';

function isChatOpen(match) {
  const now = new Date();
  const kickoff = new Date(match.kickoff);
  const minsToKickoff = (kickoff - now) / 60000;
  return match.status === 'live' || minsToKickoff <= 120;
}

function getMatchStatus(match) {
  const now = new Date();
  const kickoff = new Date(match.kickoff);
  const minsToKickoff = (kickoff - now) / 60000;
  if (match.status === 'live') return { label: 'LIVE', type: 'live' };
  if (minsToKickoff < 0) return { label: 'FT', type: 'finished' };
  if (minsToKickoff <= 120) return { label: 'Chat Open', type: 'open' };
  return { label: 'Upcoming', type: 'upcoming' };
}

function Countdown({ kickoff }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const target = new Date(kickoff);
      const diff = target - now;
      if (diff <= 0) { setTimeStr('Kick Off!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [kickoff]);

  return <span className="countdown">{timeStr}</span>;
}

export default function MatchList({ matches, user, onSelectMatch }) {
  const openMatches = matches.filter(isChatOpen);
  const closedMatches = matches.filter(m => !isChatOpen(m));

  const renderCard = (match) => {
    const status = getMatchStatus(match);
    const open = isChatOpen(match);
    const kickoff = new Date(match.kickoff);
    const kickoffStr = kickoff.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
      <div key={match.id} className={`match-card ${open ? 'open' : 'locked'}`} onClick={() => open && onSelectMatch(match)}>
        <div className="match-card-header">
          <span className="competition">{match.competition}</span>
          <span className={`status-badge status-${status.type}`}>
            {status.type === 'live' && <span className="live-dot" />}
            {status.label}
          </span>
        </div>

        <div className="match-teams">
          <div className="team-side home">
            <div className="team-badge">{match.homeTeam.badge}</div>
            <div className="team-info">
              <span className="team-full">{match.homeTeam.name}</span>
              <span className="team-short">{match.homeTeam.shortName}</span>
            </div>
          </div>

          <div className="match-vs">
            {status.type === 'live' ? (
              <span className="vs-live">LIVE</span>
            ) : (
              <div className="vs-block">
                <span className="vs-text">VS</span>
                <span className="kickoff-time">{kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>

          <div className="team-side away">
            <div className="team-info align-right">
              <span className="team-full">{match.awayTeam.name}</span>
              <span className="team-short">{match.awayTeam.shortName}</span>
            </div>
            <div className="team-badge">{match.awayTeam.badge}</div>
          </div>
        </div>

        <div className="match-card-footer">
          <span className="venue">🏟 {match.venue}</span>
          {open ? (
            <button className="enter-btn">
              {status.type === 'live' ? '🔴 Join Live Chat' : '💬 Enter Chat Room'}
            </button>
          ) : (
            <div className="locked-info">
              <span className="lock-icon">🔒</span>
              <span className="opens-in">Opens in <Countdown kickoff={new Date(new Date(match.kickoff).getTime() - 2 * 3600000)} /></span>
            </div>
          )}
        </div>
        {open && <div className="match-card-glow" />}
      </div>
    );
  };

  return (
    <div className="match-list">
      <div className="match-list-hero">
        <h1 className="hero-title">⚽ MatchDay Chat</h1>
        <p className="hero-sub">Jump into live matchday rooms — predictions, team sheets & non-stop banter</p>
        {!user && (
          <div className="hero-cta">
            <span className="hero-cta-text">Click any open match to set up your fan profile and join the chat 🔥</span>
          </div>
        )}
      </div>

      {openMatches.length > 0 && (
        <section className="match-section">
          <h2 className="section-title">
            <span className="section-dot active-dot" /> Chat Rooms Open
          </h2>
          <div className="match-grid">
            {openMatches.map(renderCard)}
          </div>
        </section>
      )}

      {closedMatches.length > 0 && (
        <section className="match-section">
          <h2 className="section-title">
            <span className="section-dot" /> Upcoming Matches
          </h2>
          <div className="match-grid">
            {closedMatches.map(renderCard)}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🏟️</span>
          <p>Loading today's fixtures...</p>
        </div>
      )}
    </div>
  );
}
