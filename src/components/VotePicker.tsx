import type { CSSProperties } from 'react';
import type { Match, VoteTally, VoteChoice, VoteVoter, VoteHistoryPoint, TeamId } from '@/lib/types';
import VoteTimelineChart from './VoteTimelineChart';
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
  badge: string;
  color: string;
  pct: number;
  count: number;
}

const MAX_AVATARS = 4;

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

export default function VotePicker({ match, votes, votersByChoice, voteHistory, userVote, onVote }: VotePickerProps) {
  const total = votes.home + votes.draw + votes.away;
  const pct = (n: number): number => (total === 0 ? 0 : Math.round((n / total) * 100));

  const homePct = pct(votes.home);
  const drawPct = pct(votes.draw);
  const awayPct = pct(votes.away);

  const options: VoteOption[] = [
    { key: 'home', label: match.homeTeam.shortName, badge: match.homeTeam.badge, color: 'var(--accent-yellow)', pct: homePct, count: votes.home },
    { key: 'draw', label: 'Draw', badge: '🤝', color: 'var(--accent-green)', pct: drawPct, count: votes.draw },
    { key: 'away', label: match.awayTeam.shortName, badge: match.awayTeam.badge, color: 'var(--accent-red)', pct: awayPct, count: votes.away },
  ];

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
              className={`vp-opt ${userVote === opt.key ? 'voted' : ''}`}
              style={{ '--opt-color': opt.color } as CSSProperties}
              onClick={() => onVote(opt.key)}
            >
              <span className="vp-opt-badge">{opt.badge}</span>
              <span className="vp-opt-label">{opt.label}</span>
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

        <VoteTimelineChart
          history={voteHistory}
          homeLabel={match.homeTeam.shortName}
          awayLabel={match.awayTeam.shortName}
        />

        {total === 0 && !userVote && <p className="vp-nudge">Cast your prediction!</p>}
      </div>

      <div className="vp-score-card">
        <div className="vp-score-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
        <div>
          <h4 className="vp-score-title">Current Score</h4>
          <p className="vp-score-hint">{match.homeTeam.shortName} vs {match.awayTeam.shortName}</p>
          <p className="vp-score-value">0-0</p>
        </div>
      </div>
    </div>
  );
}
