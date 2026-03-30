import type { Match, VoteTally, VoteChoice, Message, User } from '@/lib/types';
import ChatPanel from './ChatPanel';
import './Predictions.css';

interface PredictionsProps {
  match: Match;
  votes: VoteTally;
  userVote: VoteChoice | null;
  onVote: (vote: VoteChoice) => void;
  messages: Message[];
  user: User;
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

interface VoteOption {
  key: VoteChoice;
  label: string;
  badge: string;
  color: string;
  pct: number;
  count: number;
}

export default function Predictions({ match, votes, userVote, onVote, messages, user, onSendMessage, onReact }: PredictionsProps) {
  const total = votes.home + votes.draw + votes.away;
  const pct = (n: number): number => total === 0 ? 0 : Math.round((n / total) * 100);

  const homePct = pct(votes.home);
  const drawPct = pct(votes.draw);
  const awayPct = pct(votes.away);

  const options: VoteOption[] = [
    { key: 'home', label: match.homeTeam.shortName, badge: match.homeTeam.badge, color: '#4d8dff', pct: homePct, count: votes.home },
    { key: 'draw', label: 'Draw',                   badge: '🤝',                color: '#ffca28', pct: drawPct,  count: votes.draw },
    { key: 'away', label: match.awayTeam.shortName, badge: match.awayTeam.badge, color: '#ff6090', pct: awayPct, count: votes.away },
  ];

  return (
    <div className="pred-layout">
      {/* Vote section */}
      <div className="pred-sidebar">
        <div className="pred-card">
          <div className="pred-card-header">
            <h3 className="pred-title">Who wins?</h3>
            {total > 0 && <span className="pred-total">{total} vote{total !== 1 ? 's' : ''}</span>}
          </div>

          <div className="pred-options">
            {options.map(opt => (
              <button
                key={opt.key}
                className={`pred-opt ${userVote === opt.key ? 'voted' : ''}`}
                style={{ '--opt-color': opt.color } as React.CSSProperties}
                onClick={() => onVote(opt.key)}
              >
                <span className="pred-opt-badge">{opt.badge}</span>
                <span className="pred-opt-label">{opt.label}</span>
                {userVote === opt.key && (
                  <span className="pred-opt-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          {total > 0 && (
            <div className="pred-results">
              {options.map(opt => {
                const isLeader = opt.pct === Math.max(homePct, drawPct, awayPct) && opt.pct > 0;
                return (
                  <div key={opt.key} className="pred-bar-row">
                    <span className="pred-bar-label">{opt.label}</span>
                    <div className="pred-bar-track">
                      <div
                        className={`pred-bar-fill ${isLeader ? 'leader' : ''}`}
                        style={{
                          width: `${opt.pct}%`,
                          background: opt.color,
                          boxShadow: opt.pct > 0 ? `0 0 12px ${opt.color}50` : 'none'
                        }}
                      />
                    </div>
                    <span className="pred-bar-pct" style={{ color: opt.color }}>{opt.pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {total === 0 && !userVote && (
            <p className="pred-nudge">Cast your prediction!</p>
          )}
        </div>

        <div className="pred-score-card">
          <div className="pred-score-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div>
            <h4 className="pred-score-title">Exact Score</h4>
            <p className="pred-score-hint">Drop your scoreline in the chat</p>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="pred-chat">
        <ChatPanel
          messages={messages}
          user={user}
          onSendMessage={onSendMessage}
          onReact={onReact}
          placeholder="Your prediction..."
        />
      </div>
    </div>
  );
}
