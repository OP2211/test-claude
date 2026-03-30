'use client';

import { useState } from 'react';
import type { TeamId } from '@/lib/types';
import Logo from './Logo';
import './OnboardingModal.css';

interface TeamOption {
  id: TeamId;
  name: string;
  badge: string;
  color: string;
  league: string;
}

const TEAMS: TeamOption[] = [
  { id: 'manchester-united', name: 'Man United',  badge: '🔴', color: '#DA020E', league: 'PL' },
  { id: 'liverpool',         name: 'Liverpool',   badge: '🔴', color: '#C8102E', league: 'PL' },
  { id: 'arsenal',           name: 'Arsenal',     badge: '🔴', color: '#EF0107', league: 'PL' },
  { id: 'chelsea',           name: 'Chelsea',     badge: '🔵', color: '#034694', league: 'PL' },
  { id: 'manchester-city',   name: 'Man City',    badge: '🔵', color: '#6CABDD', league: 'PL' },
  { id: 'tottenham',         name: 'Tottenham',   badge: '⚪', color: '#132257', league: 'PL' },
  { id: 'barcelona',         name: 'Barcelona',   badge: '🔵🔴', color: '#A50044', league: 'La Liga' },
  { id: 'real-madrid',       name: 'Real Madrid', badge: '⚪', color: '#FEBE10', league: 'La Liga' },
  { id: 'bayern-munich',     name: 'Bayern',      badge: '🔴', color: '#DC052D', league: 'Bund.' },
  { id: 'juventus',          name: 'Juventus',    badge: '⚫', color: '#000000', league: 'Serie A' },
];

interface OnboardingResult {
  username: string;
  fanTeamId: TeamId;
}

interface OnboardingModalProps {
  onComplete: (result: OnboardingResult) => void;
  onClose: () => void;
}

export default function OnboardingModal({ onComplete, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [error, setError] = useState<string>('');

  const handleUsernameNext = () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('At least 2 characters needed');
      return;
    }
    if (trimmed.length > 20) {
      setError('Max 20 characters');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleComplete = () => {
    if (!selectedTeam) { setError('Pick your club!'); return; }
    onComplete({ username: username.trim(), fanTeamId: selectedTeam });
  };

  return (
    <div className="ob-overlay" onClick={onClose}>
      <div className="ob-sheet" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="ob-handle" />

        {/* Progress */}
        <div className="ob-progress" aria-label={`Step ${step} of 2`}>
          <span className={`ob-progress-dot ${step === 1 ? 'active' : 'done'}`} />
          <span className={`ob-progress-dot ${step === 2 ? 'active' : ''}`} />
        </div>

        <button className="ob-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {step === 1 && (
          <div className="ob-step" key="step1">
            <div className="ob-hero">
              <Logo size={56} animate />
              <h1 className="ob-title">Join the Match</h1>
              <p className="ob-subtitle">Real-time banter, predictions & lineup reactions with fans everywhere</p>
            </div>

            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-username">Your fan name</label>
              <div className="ob-input-wrap">
                <input
                  id="ob-username"
                  className="ob-input"
                  type="text"
                  placeholder="e.g. RedDevil99"
                  value={username}
                  maxLength={20}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleUsernameNext()}
                  autoFocus
                  autoComplete="off"
                />
                <span className="ob-char-count">{username.length}/20</span>
              </div>
              {error && <p className="ob-error">{error}</p>}
            </div>

            <button className="ob-btn primary" onClick={handleUsernameNext}>
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step" key="step2">
            <button className="ob-back" onClick={() => { setStep(1); setError(''); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>

            <div className="ob-hero compact">
              <h1 className="ob-title">Pick Your Club</h1>
              <p className="ob-subtitle">Show everyone whose side you're on</p>
            </div>

            <div className="ob-team-grid">
              {TEAMS.map(t => (
                <button
                  key={t.id}
                  className={`ob-team-card ${selectedTeam === t.id ? 'selected' : ''}`}
                  style={{ '--team-color': t.color } as React.CSSProperties}
                  onClick={() => { setSelectedTeam(t.id); setError(''); }}
                >
                  <span className="ob-team-badge">{t.badge}</span>
                  <span className="ob-team-name">{t.name}</span>
                  <span className="ob-team-league">{t.league}</span>
                  {selectedTeam === t.id && (
                    <span className="ob-team-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="ob-error">{error}</p>}

            <button
              className={`ob-btn primary ${selectedTeam ? '' : 'disabled'}`}
              onClick={handleComplete}
              disabled={!selectedTeam}
            >
              Let's Go
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
