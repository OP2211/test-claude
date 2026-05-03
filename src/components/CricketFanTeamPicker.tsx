'use client';

import { useState } from 'react';
import { CRICKET_TEAMS } from '@/lib/cricket/teams';
import type { TeamId } from '@/lib/types';
import './CricketFanTeamPicker.css';

interface Props {
  /** Called after the user successfully picks a team. Parent should refresh user state. */
  onPicked: (teamId: TeamId) => void;
  /** Dismiss for this session only — parent removes the banner. We don't persist. */
  onDismiss: () => void;
}

export default function CricketFanTeamPicker({ onPicked, onDismiss }: Props) {
  const [picking, setPicking] = useState<TeamId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (teamId: TeamId) => {
    setError(null);
    setPicking(teamId);
    try {
      const res = await fetch('/api/profile/cricket-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cricketFanTeamId: teamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save your team');
      }
      onPicked(teamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your team');
      setPicking(null);
    }
  };

  return (
    <section className="ckft" aria-label="Pick your IPL fan team">
      <div className="ckft-head">
        <div>
          <div className="ckft-eyebrow">🏏 Pick your IPL franchise</div>
          <h2 className="ckft-title">Who are you backing this season?</h2>
          <p className="ckft-sub">
            Your cricket flair shows up in match banter and on the cricket leaderboard. Pick now or come back later.
          </p>
        </div>
        <button
          type="button"
          className="ckft-skip"
          onClick={onDismiss}
          aria-label="Dismiss for now"
        >
          Maybe later
        </button>
      </div>

      <div className="ckft-grid" role="radiogroup" aria-label="IPL teams">
        {CRICKET_TEAMS.map((t) => {
          const isPicking = picking === t.id;
          const color = t.color || '#334779';
          return (
            <button
              key={t.id}
              type="button"
              className={`ckft-team ${isPicking ? 'ckft-team--loading' : ''}`}
              role="radio"
              aria-checked={isPicking}
              aria-label={`Back ${t.name}`}
              disabled={picking !== null}
              onClick={() => handlePick(t.id)}
              style={{ '--team-color': color } as React.CSSProperties}
            >
              <span className="ckft-team-crest" style={{ background: color }}>
                {t.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logo} alt="" />
                ) : (
                  <span>{t.shortName.slice(0, 3)}</span>
                )}
              </span>
              <span className="ckft-team-name">{t.shortName}</span>
              <span className="ckft-team-full">{t.name}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="ckft-error" role="alert">{error}</div>}
    </section>
  );
}
