import React from 'react';
import ChatPanel from './ChatPanel';
import './Predictions.css';

export default function Predictions({ match, votes, userVote, onVote, messages, user, onSendMessage, onReact }) {
  const total = votes.home + votes.draw + votes.away;
  const pct = (n) => total === 0 ? 0 : Math.round((n / total) * 100);

  const homePct = pct(votes.home);
  const drawPct = pct(votes.draw);
  const awayPct = pct(votes.away);

  const VOTE_OPTIONS = [
    { key: 'home', label: match.homeTeam.shortName, badge: match.homeTeam.badge, color: '#2979ff', pct: homePct, count: votes.home },
    { key: 'draw', label: 'Draw',                   badge: '🤝',                color: '#ffd600', pct: drawPct,  count: votes.draw },
    { key: 'away', label: match.awayTeam.shortName, badge: match.awayTeam.badge, color: '#ff4081', pct: awayPct, count: votes.away },
  ];

  return (
    <div className="predictions-layout">
      {/* Vote widget */}
      <div className="vote-section">
        <div className="vote-card">
          <div className="vote-header">
            <h3 className="vote-title">🎯 Your Prediction</h3>
            <span className="vote-total">{total} votes</span>
          </div>

          {/* Vote buttons */}
          <div className="vote-options">
            {VOTE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`vote-btn ${userVote === opt.key ? 'voted' : ''}`}
                style={{ '--vote-color': opt.color }}
                onClick={() => onVote(opt.key)}
              >
                <span className="vote-badge">{opt.badge}</span>
                <span className="vote-label">{opt.label}</span>
                {userVote === opt.key && <span className="vote-check">✓</span>}
              </button>
            ))}
          </div>

          {/* Progress bars */}
          {total > 0 && (
            <div className="vote-results">
              {VOTE_OPTIONS.map(opt => (
                <div key={opt.key} className="result-row">
                  <span className="result-label">{opt.label}</span>
                  <div className="result-bar-track">
                    <div
                      className="result-bar-fill"
                      style={{ width: `${opt.pct}%`, background: opt.color }}
                    />
                  </div>
                  <span className="result-pct" style={{ color: opt.color }}>{opt.pct}%</span>
                </div>
              ))}
              <p className="result-caption">{total} fan{total !== 1 ? 's' : ''} voted</p>
            </div>
          )}

          {total === 0 && !userVote && (
            <p className="vote-nudge">Cast your prediction first! 👆</p>
          )}
        </div>

        {/* Scoreline input prompt */}
        <div className="score-card">
          <h4 className="score-title">📝 Exact Score Prediction</h4>
          <p className="score-hint">Post your scoreline in the chat below — who called it closest?</p>
        </div>
      </div>

      {/* Prediction chat */}
      <div className="predictions-chat">
        <ChatPanel
          tab="predictions"
          messages={messages}
          user={user}
          onSendMessage={onSendMessage}
          onReact={onReact}
          placeholder="Give your scoreline prediction..."
        />
      </div>
    </div>
  );
}
