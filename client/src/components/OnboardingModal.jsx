import React, { useState } from 'react';
import './OnboardingModal.css';

const TEAMS = [
  { id: 'manchester-united', name: 'Manchester United', badge: '🔴', league: 'Premier League' },
  { id: 'liverpool',         name: 'Liverpool',         badge: '🔴', league: 'Premier League' },
  { id: 'arsenal',           name: 'Arsenal',           badge: '🔴', league: 'Premier League' },
  { id: 'chelsea',           name: 'Chelsea',           badge: '🔵', league: 'Premier League' },
  { id: 'manchester-city',   name: 'Manchester City',   badge: '🔵', league: 'Premier League' },
  { id: 'tottenham',         name: 'Tottenham',         badge: '⚪', league: 'Premier League' },
  { id: 'barcelona',         name: 'Barcelona',         badge: '🔵🔴', league: 'La Liga' },
  { id: 'real-madrid',       name: 'Real Madrid',       badge: '⚪', league: 'La Liga' },
  { id: 'bayern-munich',     name: 'Bayern Munich',     badge: '🔴', league: 'Bundesliga' },
  { id: 'juventus',          name: 'Juventus',          badge: '⚫', league: 'Serie A' },
];

export default function OnboardingModal({ onComplete, onClose }) {
  const [step, setStep] = useState(1); // 1=username, 2=team
  const [username, setUsername] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState('');

  const handleUsernameNext = () => {
    if (!username.trim() || username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (username.trim().length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleComplete = () => {
    if (!selectedTeam) { setError('Please pick your team!'); return; }
    onComplete({ username: username.trim(), fanTeamId: selectedTeam });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {step === 1 && (
          <div className="modal-step">
            <div className="modal-icon">⚽</div>
            <h2>Welcome to MatchDay Chat</h2>
            <p className="modal-sub">Live matchday banter, predictions & team talk with fans from every club.</p>
            <label className="modal-label">Choose your username</label>
            <input
              className="modal-input"
              type="text"
              placeholder="e.g. RedDevil1958"
              value={username}
              maxLength={20}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
              autoFocus
            />
            {error && <p className="modal-error">{error}</p>}
            <button className="modal-btn" onClick={handleUsernameNext}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div className="modal-step">
            <button className="modal-back" onClick={() => { setStep(1); setError(''); }}>← Back</button>
            <h2>Pick your team</h2>
            <p className="modal-sub">This shows everyone whose side you're on 🏟️</p>
            <div className="team-grid">
              {TEAMS.map(t => (
                <button
                  key={t.id}
                  className={`team-card ${selectedTeam === t.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                >
                  <span className="team-badge-lg">{t.badge}</span>
                  <span className="team-name-sm">{t.name}</span>
                  <span className="team-league">{t.league}</span>
                </button>
              ))}
            </div>
            {error && <p className="modal-error">{error}</p>}
            <button className="modal-btn" onClick={handleComplete} disabled={!selectedTeam}>
              Enter Chat 🔥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
