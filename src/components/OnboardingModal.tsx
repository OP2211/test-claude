'use client';

import { useSession } from 'next-auth/react';
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
import { useState } from 'react';
import type { TeamId } from '@/lib/types';
import Logo from './Logo';
import './OnboardingModal.css';

interface TeamOption {
  id: TeamId;
  name: string;
  color: string;
  logo: string;
}

const TEAMS: TeamOption[] = [
  { id: 'arsenal',           name: 'Arsenal',      color: '#e20520', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' },
  { id: 'aston-villa',       name: 'Aston Villa',  color: '#660e36', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/362.png' },
  { id: 'afc-bournemouth',   name: 'Bournemouth',  color: '#f42727', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/349.png' },
  { id: 'brentford',         name: 'Brentford',    color: '#f42727', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/337.png' },
  { id: 'brighton',          name: 'Brighton',     color: '#0606fa', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/331.png' },
  { id: 'burnley',           name: 'Burnley',      color: '#6C1D45', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/379.png' },
  { id: 'chelsea',           name: 'Chelsea',      color: '#144992', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png' },
  { id: 'crystal-palace',    name: 'C. Palace',    color: '#0202fb', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/384.png' },
  { id: 'everton',           name: 'Everton',      color: '#0606fa', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/368.png' },
  { id: 'fulham',            name: 'Fulham',       color: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/370.png' },
  { id: 'leeds-united',      name: 'Leeds',        color: '#1D428A', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png' },
  { id: 'liverpool',         name: 'Liverpool',    color: '#d11317', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' },
  { id: 'manchester-city',   name: 'Man City',     color: '#99c5ea', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png' },
  { id: 'manchester-united', name: 'Man United',   color: '#da020e', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png' },
  { id: 'newcastle-united',  name: 'Newcastle',    color: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/361.png' },
  { id: 'nottingham-forest', name: 'Nott\'m Forest', color: '#c8102e', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/393.png' },
  { id: 'sunderland',        name: 'Sunderland',   color: '#EB172B', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/366.png' },
  { id: 'tottenham',         name: 'Spurs',        color: '#132257', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png' },
  { id: 'west-ham-united',   name: 'West Ham',     color: '#7c2c3b', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/371.png' },
  { id: 'wolverhampton',     name: 'Wolves',       color: '#fdb913', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/380.png' },
];

interface OnboardingModalProps {
  onComplete: (fanTeamId: TeamId, devUsername?: string) => void;
  onClose: () => void;
}

const isDev = process.env.NODE_ENV === 'development';

export default function OnboardingModal({ onComplete, onClose }: OnboardingModalProps) {
  const { update: updateSession } = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [error, setError] = useState<string>('');
  const [devName, setDevName] = useState<string>('');

  const handleGoogleSignIn = () => {
    void openGoogleSignInPopup(() => updateSession());
  };

  const handleDevNext = () => {
    if (!devName.trim()) { setError('Enter a name'); return; }
    setError('');
    setStep(2);
  };

  const handleComplete = () => {
    if (!selectedTeam) { setError('Pick your club!'); return; }
    onComplete(selectedTeam, isDev ? devName.trim() : undefined);
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
              {isDev ? (
                <>
                  <input
                    className="ob-dev-input"
                    type="text"
                    placeholder="Enter your name"
                    value={devName}
                    onChange={e => { setDevName(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleDevNext()}
                    autoFocus
                  />
                  {error && <p className="ob-error">{error}</p>}
                  <button className="ob-btn primary" onClick={handleDevNext}>
                    Next
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
                    </svg>
                  </button>
                </>
              ) : (
                <button className="ob-google-btn" onClick={handleGoogleSignIn}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step" key="step2">
            {isDev && (
              <button className="ob-back" onClick={() => { setStep(1); setError(''); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
            )}

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
                  <img src={t.logo} alt="" className="ob-team-logo" />
                  <span className="ob-team-name">{t.name}</span>
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
