'use client';

import { useEffect, useState } from 'react';
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

const ROLE_TAG: Record<PlayerRole, string> = {
  batter: 'Batter',
  wicketkeeper: 'Keeper',
  allrounder: 'All-rounder',
  bowler: 'Bowler',
  unknown: '',
};

function PlayerAvatar({
  name, headshot, color,
}: { name: string; headshot?: string; color?: string }) {
  // Headshots from ESPN's CDN frequently 404 — fall back silently to initials.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [headshot]);

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const showImg = Boolean(headshot) && !failed;
  return (
    <span className="cksq-avatar" style={{ background: color || 'var(--bg-elevated)' }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={headshot} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="cksq-avatar-initials">{initials}</span>
      )}
    </span>
  );
}

function PlayerRow({
  index, player, color,
}: {
  index: number;
  player: SquadPlayer;
  color: string;
}) {
  const roleTag = ROLE_TAG[player.role];
  return (
    <li className="cksq-row">
      <span className="cksq-row-num">{index + 1}</span>
      <PlayerAvatar name={player.name} headshot={player.headshot} color={color} />
      <div className="cksq-row-text">
        <div className="cksq-row-name-line">
          <span className="cksq-row-name">{player.name}</span>
          {player.isCaptain && <span className="cksq-row-tag cksq-row-tag--lead">C</span>}
          {player.isWicketKeeper && <span className="cksq-row-tag cksq-row-tag--lead">WK</span>}
        </div>
        {roleTag && <div className="cksq-row-role">{roleTag}</div>}
      </div>
    </li>
  );
}

function TeamColumn({
  team, players,
}: {
  team: CricketTeamInfo;
  players: SquadPlayer[];
}) {
  const color = team.color || '#334779';

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

      {players.length > 0 ? (
        <ol className="cksq-list">
          {players.map((p, i) => (
            <PlayerRow key={p.id || p.name} index={i} player={p} color={color} />
          ))}
        </ol>
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
