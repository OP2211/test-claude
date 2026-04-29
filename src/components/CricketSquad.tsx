'use client';

import type {
  CricketMatch,
  CricketTeamInfo,
  PlayerRole,
  SquadPlayer,
} from '@/lib/cricket/types';
import './CricketSquad.css';

interface Props {
  match: CricketMatch;
}

const ROLE_ORDER: PlayerRole[] = ['batter', 'wicketkeeper', 'allrounder', 'bowler', 'unknown'];

const ROLE_LABEL: Record<PlayerRole, string> = {
  batter: 'Batters',
  wicketkeeper: 'Wicket-keeper',
  allrounder: 'All-rounders',
  bowler: 'Bowlers',
  unknown: 'Squad',
};

const ROLE_ICON: Record<PlayerRole, string> = {
  batter: '🏏',
  wicketkeeper: '🧤',
  allrounder: '⚡',
  bowler: '🎯',
  unknown: '•',
};

function groupByRole(players: SquadPlayer[]): Map<PlayerRole, SquadPlayer[]> {
  const groups = new Map<PlayerRole, SquadPlayer[]>();
  for (const p of players) {
    const arr = groups.get(p.role) ?? [];
    arr.push(p);
    groups.set(p.role, arr);
  }
  return groups;
}

function TeamColumn({
  team, players,
}: {
  team: CricketTeamInfo;
  players: SquadPlayer[];
}) {
  const color = team.color || '#334779';
  const groups = groupByRole(players);
  const hasPlayers = players.length > 0;

  return (
    <div className="cksq-col" style={{ borderTopColor: color }}>
      <div className="cksq-col-header">
        <div className="cksq-col-crest" style={{ background: color }}>
          {team.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo} alt="" />
          ) : (
            <span>{team.shortName.slice(0, 3)}</span>
          )}
        </div>
        <div className="cksq-col-meta">
          <div className="cksq-col-short">{team.shortName}</div>
          <div className="cksq-col-full">{team.name}</div>
        </div>
        <span className="cksq-col-count">{players.length}/11</span>
      </div>

      {hasPlayers ? (
        <div className="cksq-groups">
          {ROLE_ORDER.map((role) => {
            const list = groups.get(role);
            if (!list || list.length === 0) return null;
            return (
              <div key={role} className="cksq-group">
                <h4 className="cksq-group-title">
                  <span className="cksq-group-icon" aria-hidden>{ROLE_ICON[role]}</span>
                  {ROLE_LABEL[role]}
                  <span className="cksq-group-count">{list.length}</span>
                </h4>
                <ul className="cksq-list">
                  {list.map((p) => (
                    <li key={p.id || p.name} className="cksq-player">
                      <span className="cksq-player-avatar" style={{ background: color }}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="cksq-player-name">{p.name}</span>
                      {p.badge && <span className="cksq-player-badge">{p.badge}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cksq-empty">
          <div className="cksq-empty-title">Playing XI not announced</div>
          <div className="cksq-empty-sub">Usually released shortly before toss.</div>
        </div>
      )}
    </div>
  );
}

export default function CricketSquad({ match }: Props) {
  const home = match.squad?.home ?? [];
  const away = match.squad?.away ?? [];
  return (
    <div className="cksq">
      <div className="cksq-header">
        <h2 className="cksq-title">Playing XI</h2>
        <p className="cksq-sub">Confirmed line-ups as shared by both camps.</p>
      </div>

      <div className="cksq-grid">
        <TeamColumn team={match.home} players={home} />
        <TeamColumn team={match.away} players={away} />
      </div>
    </div>
  );
}
