'use client';

import { useEffect, useState } from 'react';
import type { CricketMatch, CricketTeamInfo } from '@/lib/cricket/types';
import './CricketMatchList.css';

interface Props {
  matches: CricketMatch[];
  isLoading: boolean;
  onSelectMatch: (match: CricketMatch) => void;
  isJoinDisabled?: boolean;
}

function latestInningsFor(match: CricketMatch, teamId: string) {
  return [...match.innings].reverse().find((i) => i.teamId === teamId);
}

interface ScoreLine {
  score: string;
  overs: string;
  hasScore: boolean;
}

function scoreLine(match: CricketMatch, team: CricketTeamInfo): ScoreLine {
  const last = latestInningsFor(match, team.id);
  if (!last || (last.runs === 0 && last.wickets === 0 && last.overs === 0)) {
    return { score: '', overs: '', hasScore: false };
  }
  return {
    score: `${last.runs}/${last.wickets}`,
    overs: `(${last.overs} ov)`,
    hasScore: true,
  };
}

/** ESPN's `description` is "44th Match (N), Indian Premier League at Chennai, May 2 2026".
 *  Strip the league/venue/date tail so we just keep "44th Match (N)". */
function shortMatchTitle(description: string | undefined, leagueName: string): string {
  if (!description) return '';
  // Stop at first comma (everything after duplicates league/venue/date elsewhere).
  const head = description.split(',')[0].trim();
  if (!head) return '';
  // Avoid showing the league name twice when ESPN packs it into the head somehow.
  const without = head.replace(new RegExp(`\\s*${leagueName}\\s*`, 'i'), ' ').trim();
  return without || head;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (sameDay) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function Countdown({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function update() {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) { setLabel('Starting soon'); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (d > 0) setLabel(`Starts in ${d}d ${h}h`);
      else if (h > 0) setLabel(`Starts in ${h}h ${m}m`);
      else setLabel(`Starts in ${m}m`);
    }
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [iso]);
  if (!label) return null;
  return <span className="ckl-countdown">{label}</span>;
}

function TeamRow({
  team, line, batting, isWinner, isLive,
}: {
  team: CricketTeamInfo;
  line: ScoreLine;
  batting: boolean;
  isWinner: boolean;
  isLive: boolean;
}) {
  const color = team.color || '#334779';
  const initials = team.shortName.slice(0, 3);
  return (
    <div
      className={[
        'ckl-team-row',
        batting ? 'ckl-team-row--batting' : '',
        isWinner ? 'ckl-team-row--winner' : '',
        !line.hasScore ? 'ckl-team-row--idle' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--team-color': color } as React.CSSProperties}
    >
      <div className="ckl-team-crest" style={{ background: color }}>
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="ckl-team-name">
        <span className="ckl-team-short">{team.shortName}</span>
        <span className="ckl-team-full">{team.name}</span>
      </div>
      <div className="ckl-team-score">
        {line.hasScore ? (
          <>
            {batting && isLive && (
              <span className="ckl-team-batting-pill" aria-label="Currently batting">
                <span className="ckl-team-batting-dot" /> Batting
              </span>
            )}
            <span className="ckl-team-runs">{line.score}</span>
            <span className="ckl-team-overs">{line.overs}</span>
          </>
        ) : (
          <span className="ckl-team-yetbat">Yet to bat</span>
        )}
      </div>
    </div>
  );
}

function CricketCard({ match, onClick, disabled }: {
  match: CricketMatch;
  onClick: () => void;
  disabled?: boolean;
}) {
  const home = scoreLine(match, match.home);
  const away = scoreLine(match, match.away);
  const homeBatting = match.innings.some((i) => i.teamId === match.home.id && i.isBatting);
  const awayBatting = match.innings.some((i) => i.teamId === match.away.id && i.isBatting);

  const result = match.result || '';
  const homeWinner = match.status === 'finished' && new RegExp(`\\b${match.home.shortName}\\b`, 'i').test(result);
  const awayWinner = match.status === 'finished' && new RegExp(`\\b${match.away.shortName}\\b`, 'i').test(result);

  const statusKind =
    match.status === 'live' ? 'live' :
    match.status === 'finished' ? 'finished' : 'upcoming';

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  // Upcoming matches are entirely disabled until they go live, regardless of when chat would open.
  const cardDisabled = disabled || isUpcoming;

  // CTA copy by state.
  const ctaText = isLive ? 'Join the room' : isUpcoming ? 'Opens when live' : 'View room';

  const matchTitle = shortMatchTitle(match.description, match.leagueName);

  return (
    <button
      type="button"
      className={`ckl-card ckl-card--${statusKind} ${cardDisabled ? 'ckl-card--locked' : ''}`}
      onClick={onClick}
      disabled={cardDisabled}
      style={{
        '--home-color': match.home.color || '#334779',
        '--away-color': match.away.color || '#334779',
      } as React.CSSProperties}
    >
      {/* Top-edge stripe (live: animated red→amber; recent: subtle; upcoming: blue tint) */}
      <span className="ckl-card-stripe" aria-hidden />

      {/* Head: status + match title + time/countdown */}
      <div className="ckl-card-head">
        <div className="ckl-head-left">
          {isLive ? (
            <span className="ckl-pill ckl-pill--live">
              <span className="ckl-pill-dot" aria-hidden />
              LIVE
            </span>
          ) : match.status === 'finished' ? (
            <span className="ckl-pill ckl-pill--fin">RESULT</span>
          ) : (
            <span className="ckl-pill ckl-pill--up">UPCOMING</span>
          )}
          <span className="ckl-head-league">IPL</span>
          {matchTitle && <span className="ckl-head-title">{matchTitle}</span>}
        </div>
        <div className="ckl-head-right">
          {match.status === 'upcoming' ? (
            <Countdown iso={match.start} />
          ) : (
            <span className="ckl-head-time">{dateLabel(match.start)}</span>
          )}
        </div>
      </div>

      {/* Body: stacked team rows */}
      <div className="ckl-card-body">
        <TeamRow team={match.home} line={home} batting={homeBatting} isWinner={homeWinner} isLive={isLive} />
        <TeamRow team={match.away} line={away} batting={awayBatting} isWinner={awayWinner} isLive={isLive} />
      </div>

      {/* Foot: result/toss/venue + CTA */}
      <div className="ckl-card-foot">
        <div className="ckl-foot-text">
          {match.result ? (
            <span className="ckl-foot-result">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 22V13a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v9" />
                <path d="M18 2v7a6 6 0 0 1-12 0V2" />
              </svg>
              {match.result}
            </span>
          ) : match.toss ? (
            <span className="ckl-foot-toss">{match.toss}</span>
          ) : (
            <span className="ckl-foot-venue">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {match.venue}
            </span>
          )}
          {isUpcoming && (
            <span className="ckl-foot-hint">· Opens when the match goes live</span>
          )}
        </div>
        <span className="ckl-foot-cta">
          {ctaText}
          {isUpcoming ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </span>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="ckl-card ckl-card--skeleton" aria-hidden="true">
      <div className="ckl-sk-line ckl-sk-w30" />
      <div className="ckl-sk-rows">
        <div className="ckl-sk-row" />
        <div className="ckl-sk-row" />
      </div>
      <div className="ckl-sk-line ckl-sk-w50" />
    </div>
  );
}

export default function CricketMatchList({
  matches, isLoading, onSelectMatch, isJoinDisabled,
}: Props) {
  if (isLoading) {
    return (
      <div className="ckl-page">
        <div className="ckl-grid">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming');

  if (live.length === 0 && upcoming.length === 0) {
    return (
      <div className="ckl-page">
        <div className="ckl-empty">
          <div className="ckl-empty-title">No IPL matches right now</div>
          <div className="ckl-empty-sub">Check back closer to the next fixture.</div>
        </div>
      </div>
    );
  }

  const Section = ({
    title, list, tone,
  }: { title: string; list: CricketMatch[]; tone: 'live' | 'upcoming' }) => (
    list.length === 0 ? null : (
      <section className="ckl-section">
        <header className="ckl-section-header">
          <span className={`ckl-section-dot ckl-section-dot--${tone}`} />
          <span className="ckl-section-title">{title}</span>
          <span className="ckl-section-count">{list.length}</span>
        </header>
        <div className="ckl-grid">
          {list.map((m) => (
            <CricketCard
              key={m.id}
              match={m}
              onClick={() => onSelectMatch(m)}
              disabled={isJoinDisabled}
            />
          ))}
        </div>
      </section>
    )
  );

  return (
    <div className="ckl-page">
      <Section title="Live now" list={live} tone="live" />
      <Section title="Upcoming" list={upcoming} tone="upcoming" />
    </div>
  );
}
