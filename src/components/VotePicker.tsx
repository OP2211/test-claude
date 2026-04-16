'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Match, VoteTally, VoteChoice, VoteVoter, VoteHistoryPoint, TeamId } from '@/lib/types';
import VoteTimelineChart from './VoteTimelineChart';
import TeamLogoImage from './TeamLogoImage';
import './VotePicker.css';

const TEAM_COLORS: Record<string, string> = {
  'manchester-united': '#DA020E',
  liverpool: '#C8102E',
  arsenal: '#EF0107',
  chelsea: '#034694',
  'manchester-city': '#6CABDD',
  tottenham: '#132257',
  barcelona: '#A50044',
  'real-madrid': '#FEBE10',
  'bayern-munich': '#DC052D',
  juventus: '#9a9a9a',
};

function teamColor(fanTeamId: TeamId | null): string {
  return fanTeamId && TEAM_COLORS[fanTeamId] ? TEAM_COLORS[fanTeamId] : 'var(--accent-blue)';
}

/** Minutes since match kickoff. Negative = before kickoff. */
function minutesSinceKickoff(match: Match): number {
  return (Date.now() - new Date(match.kickoff).getTime()) / 60_000;
}

export interface VotePickerProps {
  match: Match;
  votes: VoteTally;
  votersByChoice: Record<VoteChoice, VoteVoter[]>;
  voteHistory: VoteHistoryPoint[];
  userVote: VoteChoice | null;
  onVote: (vote: VoteChoice) => void;
}

interface VoteOption {
  key: VoteChoice;
  label: string;
  logo?: string;
  badge: string;
  color: string;
  pct: number;
  count: number;
}

const MAX_AVATARS = 4;
const VOTE_CHANGE_LIMIT = 1;
const VOTE_LOCK_MINUTES = 10;

function UsersGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Score prediction: two single-digit inputs with a dash between them. */
function ScorePrediction({ match }: { match: Match }) {
  const scoreKey = `ffc_score_${match.id}`;
  const [homeGoals, setHomeGoals] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { const s = JSON.parse(localStorage.getItem(scoreKey) || '{}'); return s.home ?? ''; } catch { return ''; }
  });
  const [awayGoals, setAwayGoals] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { const s = JSON.parse(localStorage.getItem(scoreKey) || '{}'); return s.away ?? ''; } catch { return ''; }
  });
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { const s = JSON.parse(localStorage.getItem(scoreKey) || '{}'); return s.locked === true; } catch { return false; }
  });
  const awayRef = useRef<HTMLInputElement>(null);

  const handleDigit = (value: string, setter: (v: string) => void, autoFocusNext?: () => void) => {
    // Only allow single digit 0-9
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 1);
    setter(cleaned);
    if (cleaned && autoFocusNext) autoFocusNext();
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = () => {
    if (homeGoals !== '' && awayGoals !== '') {
      setShowConfirm(true);
    }
  };

  const confirmLock = () => {
    setSubmitted(true);
    setShowConfirm(false);
    try {
      localStorage.setItem(scoreKey, JSON.stringify({ home: homeGoals, away: awayGoals, locked: true }));
    } catch {}
  };

  return (
    <div className="vp-score-card">
      <div className="vp-score-header">
        <svg className="vp-score-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <h4 className="vp-score-title">Score Prediction</h4>
      </div>

      <div className="vp-score-teams">
        <div className="vp-score-team">
          {match.homeTeam.logo ? (
            <TeamLogoImage src={match.homeTeam.logo} alt="" className="vp-score-team-logo" />
          ) : (
            <span className="vp-score-team-badge">{match.homeTeam.badge}</span>
          )}
          <span className="vp-score-team-name">{match.homeTeam.shortName}</span>
        </div>

        <div className="vp-score-inputs">
          <input
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={`vp-score-box ${submitted ? 'locked' : ''}`}
            value={homeGoals}
            onChange={e => handleDigit(e.target.value, setHomeGoals, () => awayRef.current?.focus())}
            disabled={submitted}
            placeholder="0"
            aria-label={`${match.homeTeam.shortName} goals`}
          />
          <span className="vp-score-dash">-</span>
          <input
            ref={awayRef}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={`vp-score-box ${submitted ? 'locked' : ''}`}
            value={awayGoals}
            onChange={e => handleDigit(e.target.value, setAwayGoals)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            disabled={submitted}
            placeholder="0"
            aria-label={`${match.awayTeam.shortName} goals`}
          />
        </div>

        <div className="vp-score-team">
          {match.awayTeam.logo ? (
            <TeamLogoImage src={match.awayTeam.logo} alt="" className="vp-score-team-logo" />
          ) : (
            <span className="vp-score-team-badge">{match.awayTeam.badge}</span>
          )}
          <span className="vp-score-team-name">{match.awayTeam.shortName}</span>
        </div>
      </div>

      {!submitted && !showConfirm && homeGoals !== '' && awayGoals !== '' && (
        <button className="vp-score-submit" onClick={handleSubmit}>
          Lock Prediction
        </button>
      )}
      {showConfirm && !submitted && (
        <div className="vp-score-confirm">
          <p className="vp-score-confirm-text">
            Lock <strong>{homeGoals} - {awayGoals}</strong>? This can&apos;t be changed.
          </p>
          <div className="vp-score-confirm-actions">
            <button className="vp-score-confirm-btn cancel" onClick={() => setShowConfirm(false)}>Go Back</button>
            <button className="vp-score-confirm-btn confirm" onClick={confirmLock}>Confirm</button>
          </div>
        </div>
      )}
      {submitted && (
        <p className="vp-score-locked">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Prediction locked
        </p>
      )}
    </div>
  );
}

export default function VotePicker({ match, votes, votersByChoice, voteHistory, userVote, onVote }: VotePickerProps) {
  const total = votes.home + votes.draw + votes.away;
  const pct = (n: number): number => (total === 0 ? 0 : Math.round((n / total) * 100));

  const homePct = pct(votes.home);
  const drawPct = pct(votes.draw);
  const awayPct = pct(votes.away);

  // Track how many times the user has changed their vote
  const [voteChangeCount, setVoteChangeCount] = useState(0);
  const [firstVoteTime, setFirstVoteTime] = useState<number | null>(null);
  const [lockMessage, setLockMessage] = useState<string>('');

  // Persist vote state per match in localStorage
  const storageKey = `ffc_vote_${match.id}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setVoteChangeCount(parsed.changeCount ?? 0);
        setFirstVoteTime(parsed.firstVoteTime ?? null);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const isVoteLocked = useCallback((): boolean => {
    if (!userVote) return false; // First vote is always allowed
    if (voteChangeCount >= VOTE_CHANGE_LIMIT) return true;
    if (firstVoteTime && minutesSinceKickoff(match) > VOTE_LOCK_MINUTES) return true;
    return false;
  }, [userVote, voteChangeCount, firstVoteTime, match]);

  // Confirmation state for vote
  const [pendingVote, setPendingVote] = useState<VoteChoice | null>(null);

  const handleVoteClick = useCallback((choice: VoteChoice) => {
    if (userVote === choice) return; // Already selected

    if (isVoteLocked()) {
      if (voteChangeCount >= VOTE_CHANGE_LIMIT) {
        setLockMessage('You already changed your prediction once.');
      } else {
        setLockMessage('Predictions lock after 10 minutes.');
      }
      setTimeout(() => setLockMessage(''), 3000);
      return;
    }

    setPendingVote(choice);
  }, [userVote, isVoteLocked, voteChangeCount]);

  const confirmVote = useCallback(() => {
    if (!pendingVote) return;

    const isChange = userVote !== null;
    const newCount = isChange ? voteChangeCount + 1 : voteChangeCount;
    const newFirstTime = firstVoteTime ?? Date.now();

    setVoteChangeCount(newCount);
    setFirstVoteTime(newFirstTime);

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        changeCount: newCount,
        firstVoteTime: newFirstTime,
      }));
    } catch { /* ignore */ }

    onVote(pendingVote);
    setPendingVote(null);
  }, [pendingVote, userVote, voteChangeCount, firstVoteTime, storageKey, onVote]);

  const options: VoteOption[] = [
    { key: 'home', label: match.homeTeam.shortName, logo: match.homeTeam.logo, badge: match.homeTeam.badge, color: 'var(--accent-yellow)', pct: homePct, count: votes.home },
    { key: 'draw', label: 'Draw', badge: '\u{1F91D}', color: 'var(--accent-green)', pct: drawPct, count: votes.draw },
    { key: 'away', label: match.awayTeam.shortName, logo: match.awayTeam.logo, badge: match.awayTeam.badge, color: 'var(--accent-red)', pct: awayPct, count: votes.away },
  ];

  const locked = isVoteLocked();

  return (
    <div className="vp-root">
      <div className="vp-card">
        <div className="vp-card-header">
          <h3 className="vp-title">Who wins?</h3>
          {total > 0 && (
            <span className="vp-total">
              {total} vote{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="vp-options">
          {options.map(opt => (
            <button
              key={opt.key}
              type="button"
              className={`vp-opt ${userVote === opt.key ? 'voted' : ''} ${locked && userVote !== opt.key ? 'disabled' : ''}`}
              style={{ '--opt-color': opt.color } as CSSProperties}
              onClick={() => handleVoteClick(opt.key)}
              disabled={locked && userVote !== opt.key}
            >
              <div className="vp-opt-top">
                {opt.logo ? (
                  <TeamLogoImage src={opt.logo} alt="" className="vp-opt-logo" />
                ) : (
                  <span className="vp-opt-badge">{opt.badge}</span>
                )}
                <span className="vp-opt-label">{opt.label}</span>
              </div>
              {userVote === opt.key && (
                <span className="vp-opt-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        {pendingVote && (
          <div className="vp-vote-confirm">
            <p className="vp-vote-confirm-text">
              Predict <strong>{pendingVote === 'home' ? match.homeTeam.shortName : pendingVote === 'away' ? match.awayTeam.shortName : 'Draw'}</strong> {(pendingVote !== 'home' && pendingVote !== 'away') ? "?": "to win?"}
              {!userVote && ' You can only change this once.'}
            </p>
            <div className="vp-vote-confirm-actions">
              <button className="vp-vote-confirm-btn cancel" onClick={() => setPendingVote(null)}>Cancel</button>
              <button className="vp-vote-confirm-btn confirm" onClick={confirmVote}>Confirm</button>
            </div>
          </div>
        )}

        {lockMessage && (
          <p className="vp-lock-msg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {lockMessage}
          </p>
        )}

        {total > 0 && (
          <div className="vp-results">
            {options.map(opt => {
              const isLeader = opt.pct === Math.max(homePct, drawPct, awayPct) && opt.pct > 0;
              const voters = votersByChoice[opt.key] || [];
              const tail = voters.slice(-MAX_AVATARS);
              const extra = voters.length - tail.length;
              const title = voters.map(v => v.username).join(', ');

              return (
                <div key={opt.key} className="vp-bar-row">
                  <span className="vp-bar-label">{opt.label}</span>
                  <div className="vp-bar-track">
                    <div
                      className={`vp-bar-fill ${isLeader ? 'leader' : ''}`}
                      style={{
                        width: `${opt.pct}%`,
                        background: opt.color,
                        boxShadow: opt.pct > 0 ? `0 0 10px ${opt.color}45` : 'none',
                      }}
                    />
                  </div>
                  <div className="vp-bar-meta">
                    <div className="vp-bar-avatars" title={title || undefined}>
                      {tail.length > 0 ? (
                        <>
                          {tail.map((v, i) => (
                            <span
                              key={v.userId}
                              className="vp-bar-av"
                              style={{
                                zIndex: i + 1,
                                background: v.image ? 'transparent' : teamColor(v.fanTeamId),
                              }}
                            >
                              {v.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars; host not in next.config
                                <img src={v.image} alt="" width={18} height={18} />
                              ) : (
                                v.username?.[0]?.toUpperCase() ?? '?'
                              )}
                            </span>
                          ))}
                          {extra > 0 && <span className="vp-bar-more">+{extra}</span>}
                        </>
                      ) : opt.count > 0 ? (
                        <span className="vp-bar-users-fallback" aria-hidden>
                          <UsersGlyph />
                        </span>
                      ) : null}
                    </div>
                    <span className="vp-bar-pct" style={{ color: opt.color }}>
                      {opt.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        

        {total === 0 && !userVote && <p className="vp-nudge">Cast your prediction!</p>}
      </div>

      <ScorePrediction match={match} />
    </div>
  );
}
