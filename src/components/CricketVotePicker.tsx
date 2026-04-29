'use client';

import type { CricketMatch } from '@/lib/cricket/types';
import type { VoteChoice, VoteTally } from '@/lib/types';
import './CricketVotePicker.css';

interface Props {
  match: CricketMatch;
  votes: VoteTally;
  userVote: VoteChoice | null;
  onVote: (choice: VoteChoice) => void;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function CricketVotePicker({ match, votes, userVote, onVote }: Props) {
  const total = votes.home + votes.away;
  const homePct = pct(votes.home, total);
  const awayPct = pct(votes.away, total);

  const Row = ({
    choice,
    label,
    name,
    color,
    count,
    percent,
  }: {
    choice: 'home' | 'away';
    label: string;
    name: string;
    color: string;
    count: number;
    percent: number;
  }) => {
    const selected = userVote === choice;
    return (
      <button
        type="button"
        className={`ck-vp-row ${selected ? 'ck-vp-row--active' : ''}`}
        style={{ '--team-color': color } as React.CSSProperties}
        onClick={() => onVote(choice)}
      >
        <div className="ck-vp-bar" style={{ width: `${percent}%` }} />
        <div className="ck-vp-row-inner">
          <div className="ck-vp-row-left">
            <span className="ck-vp-side">{label}</span>
            <span className="ck-vp-team">{name}</span>
          </div>
          <div className="ck-vp-row-right">
            <span className="ck-vp-percent">{percent}%</span>
            <span className="ck-vp-count">{count} {count === 1 ? 'vote' : 'votes'}</span>
          </div>
        </div>
        {selected && <span className="ck-vp-check" aria-hidden>✓</span>}
      </button>
    );
  };

  return (
    <div className="ck-vp">
      <div className="ck-vp-head">
        <h3 className="ck-vp-title">Who wins?</h3>
        <p className="ck-vp-sub">
          {userVote
            ? 'You can change your pick anytime.'
            : 'Lock in your call — tap a team.'}
        </p>
      </div>

      <div className="ck-vp-rows">
        <Row
          choice="home"
          label="Home"
          name={match.home.name}
          color={match.home.color || '#334779'}
          count={votes.home}
          percent={homePct}
        />
        <Row
          choice="away"
          label="Away"
          name={match.away.name}
          color={match.away.color || '#334779'}
          count={votes.away}
          percent={awayPct}
        />
      </div>

      <div className="ck-vp-footer">
        <span className="ck-vp-total">
          {total === 0 ? 'Be the first to predict' : `${total} ${total === 1 ? 'fan' : 'fans'} picked`}
        </span>
      </div>
    </div>
  );
}
