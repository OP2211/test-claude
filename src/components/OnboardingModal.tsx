'use client';

import { useMemo, useState } from 'react';
import type { TeamId } from '@/lib/types';
import { TEAMS } from '@/lib/teams';
import { CRICKET_TEAMS } from '@/lib/cricket/teams';
import Logo from './Logo';
import TeamLogoImage from './TeamLogoImage';
import './OnboardingModal.css';

interface OnboardingData {
  username: string;
  phone: string;
  fanTeamId: TeamId;
  dob: string | null;
  city: string | null;
}

interface OnboardingModalProps {
  onComplete: (data: OnboardingData) => Promise<void>;
  onClose: () => void;
  /** Which sport's teams to show on the picker step. Default 'football'. */
  sport?: 'football' | 'cricket';
}

interface TeamCard {
  id: TeamId;
  name: string;
  logo: string;
  color: string;
}

export default function OnboardingModal({ onComplete, onClose, sport = 'football' }: OnboardingModalProps) {
  const teams: TeamCard[] = useMemo(() => {
    if (sport === 'cricket') {
      return CRICKET_TEAMS.map((t) => ({
        id: t.id,
        name: t.name,
        // Cricket franchises mostly don't ship a logo URL — TeamLogoImage falls back gracefully.
        logo: t.logo ?? '',
        color: t.color,
      }));
    }
    return TEAMS.map((t) => ({ id: t.id, name: t.name, logo: t.logo, color: t.color }));
  }, [sport]);
  const teamPickerTitle = sport === 'cricket' ? 'Pick Your IPL Franchise' : 'Pick Your Club';
  const teamPickerSub = sport === 'cricket'
    ? 'Show everyone whose camp you’re in'
    : 'Show everyone whose side you’re on';
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const normalizedPhoneDigits = phone.replace(/\D/g, '');

  const checkUsernameAvailability = async () => {
    const value = username.trim();
    if (!value) {
      setUsernameError('Username is required');
      setUsernameAvailable(null);
      return false;
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameAvailable(null);
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscore');
      setUsernameAvailable(null);
      return false;
    }

    setIsCheckingUsername(true);
    setUsernameError('');
    try {
      const res = await fetch(`/api/profile/username-available?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.error === 'Username already taken') {
          setUsernameError('Username is unavailable, choose another one');
          setUsernameAvailable(false);
          return false;
        }
        setUsernameError(data.error ?? 'Could not verify username');
        setUsernameAvailable(null);
        return false;
      }
      if (!data.available) {
        setUsernameError('Username is unavailable, choose another one');
        setUsernameAvailable(false);
        return false;
      }
      setUsernameAvailable(true);
      return true;
    } catch {
      setUsernameError('Could not verify username');
      setUsernameAvailable(null);
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleDetailsNext = async () => {
    if (!username.trim()) { setUsernameError('Username is required'); return; }
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (normalizedPhoneDigits.length !== 10) { setError('Phone number must have exactly 10 digits'); return; }
    const ok = await checkUsernameAvailability();
    if (!ok) return;
    setError('');
    setStep(2);
  };

  const handleComplete = async () => {
    if (!selectedTeam) { setError('Pick your club!'); return; }
    setIsSaving(true);
    setError('');
    try {
      await onComplete({
        username: username.trim(),
        phone: normalizedPhoneDigits,
        fanTeamId: selectedTeam,
        dob: dob.trim() || null,
        city: city.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsSaving(false);
    }
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
              <h1 className="ob-title">Complete Your Profile</h1>
              <p className="ob-subtitle">Add your details before entering the match chat room</p>
            </div>

            <div className="ob-field">
              <input
                className="ob-dev-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                  setUsernameError('');
                  setUsernameAvailable(null);
                }}
                onBlur={() => void checkUsernameAvailability()}
                autoFocus
              />
              {isCheckingUsername && <p className="ob-subtitle">Checking username...</p>}
              {usernameAvailable && !usernameError && <p className="ob-subtitle">Username is available</p>}
              {usernameError && <p className="ob-error">{usernameError}</p>}
              <input
                className="ob-dev-input"
                type="tel"
                placeholder="Phone number (10 digits)"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
              />
              <input
                className="ob-dev-input"
                type="date"
                placeholder="Date of birth (optional)"
                value={dob}
                onChange={e => setDob(e.target.value)}
              />
              <input
                className="ob-dev-input"
                type="text"
                placeholder="City (optional)"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
              {error && <p className="ob-error">{error}</p>}
              <button className="ob-btn primary" onClick={() => void handleDetailsNext()} disabled={isCheckingUsername}>
                Next
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
                </svg>
              </button>
            </div>
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
              <h1 className="ob-title">{teamPickerTitle}</h1>
              <p className="ob-subtitle">{teamPickerSub}</p>
            </div>

            <div className="ob-team-grid">
              {teams.map(t => (
                <button
                  key={t.id}
                  className={`ob-team-card ${selectedTeam === t.id ? 'selected' : ''}`}
                  style={{ '--team-color': t.color } as React.CSSProperties}
                  onClick={() => { setSelectedTeam(t.id); setError(''); }}
                >
                  {t.logo
                    ? <TeamLogoImage src={t.logo} alt="" className="ob-team-logo" />
                    : <span
                        className="ob-team-logo ob-team-logo--initials"
                        style={{ background: t.color }}
                        aria-hidden
                      >
                        {t.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()}
                      </span>}
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
              onClick={() => void handleComplete()}
              disabled={!selectedTeam || isSaving}
            >
              {isSaving ? 'Saving...' : "Let's Go"}
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
