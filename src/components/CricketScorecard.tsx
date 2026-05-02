'use client';

import { useMemo, useState, useEffect } from 'react';
import type {
  BattingStat,
  BowlingStat,
  CricketMatch,
  CricketTeamInfo,
  FallOfWicket,
  InningsDetail,
  LiveState,
} from '@/lib/cricket/types';
import './CricketScorecard.css';

interface Props {
  match: CricketMatch;
}

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────── */

function teamForId(match: CricketMatch, id: string): CricketTeamInfo | null {
  if (id === match.home.id) return match.home;
  if (id === match.away.id) return match.away;
  return null;
}

function buildInningsList(match: CricketMatch): InningsDetail[] {
  if (match.inningsDetail && match.inningsDetail.length > 0) return match.inningsDetail;
  return match.innings.map((i) => {
    const team = teamForId(match, i.teamId) ?? match.home;
    return {
      period: i.period,
      teamId: i.teamId,
      teamShortName: team.shortName,
      runs: i.runs,
      wickets: i.wickets,
      overs: i.overs,
      isBatting: i.isBatting,
      batting: [],
      bowling: [],
      display: i.display,
    } satisfies InningsDetail;
  });
}

function PlayerAvatar({
  name, headshot, color,
}: { name: string; headshot?: string; color?: string }) {
  // ESPN's cricket headshot CDN 404s frequently. Fall back to initials silently when
  // the image fails to load so we don't render a broken-image placeholder.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [headshot]);

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const showImg = headshot && !failed;
  return (
    <span className="ckg-avatar" style={{ background: color || 'var(--bg-elevated)' }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={headshot}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="ckg-avatar-initials">{initials}</span>
      )}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Top match summary card (Google Sports style)
 * ────────────────────────────────────────────────────────────────────── */

function TeamScoreBlock({
  team, runs, wickets, overs, hasBatted, isWinner,
}: {
  team: CricketTeamInfo;
  runs?: number;
  wickets?: number;
  overs?: number;
  hasBatted: boolean;
  isWinner?: boolean;
}) {
  return (
    <div className={`ckg-sum-team ${isWinner ? 'ckg-sum-team--winner' : ''}`}>
      <div className="ckg-sum-crest" style={{ background: team.color || '#334779' }}>
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" />
        ) : (
          <span>{team.shortName.slice(0, 3)}</span>
        )}
      </div>
      <div className="ckg-sum-score">
        {hasBatted && typeof runs === 'number' && typeof wickets === 'number' ? (
          <>
            <div className="ckg-sum-runs">{runs}/{wickets}</div>
            {typeof overs === 'number' && overs > 0 && (
              <div className="ckg-sum-overs">({overs})</div>
            )}
          </>
        ) : (
          <div className="ckg-sum-yetbat">Yet to bat</div>
        )}
      </div>
      <div className="ckg-sum-team-name">{team.shortName}</div>
    </div>
  );
}

function MatchSummaryCard({ match, live }: { match: CricketMatch; live?: LiveState }) {
  const homeInn = match.innings.find((i) => i.teamId === match.home.id);
  const awayInn = match.innings.find((i) => i.teamId === match.away.id);

  const homeWinner = match.status === 'finished' &&
    new RegExp(`\\b${match.home.shortName}\\b`, 'i').test(match.result || '');
  const awayWinner = match.status === 'finished' &&
    new RegExp(`\\b${match.away.shortName}\\b`, 'i').test(match.result || '');

  const battingTeam =
    live?.battingTeamId ? teamForId(match, live.battingTeamId) : null;
  const bowlingTeam =
    live?.bowlingTeamId ? teamForId(match, live.bowlingTeamId) : null;

  return (
    <section className="ckg-sum">
      <div className="ckg-sum-head">
        <span className="ckg-sum-league">{match.leagueName === 'Indian Premier League' ? 'IPL' : match.leagueName}</span>
        {match.status === 'live' ? (
          <span className="ckg-sum-live">
            <span className="ckg-sum-live-dot" aria-hidden />
            Live
          </span>
        ) : match.status === 'finished' ? (
          <span className="ckg-sum-state">Result</span>
        ) : (
          <span className="ckg-sum-state">Upcoming</span>
        )}
      </div>

      <div className="ckg-sum-row">
        <TeamScoreBlock
          team={match.home}
          runs={homeInn?.runs}
          wickets={homeInn?.wickets}
          overs={homeInn?.overs}
          hasBatted={Boolean(homeInn)}
          isWinner={homeWinner}
        />
        <div className="ckg-sum-vs">vs</div>
        <TeamScoreBlock
          team={match.away}
          runs={awayInn?.runs}
          wickets={awayInn?.wickets}
          overs={awayInn?.overs}
          hasBatted={Boolean(awayInn)}
          isWinner={awayWinner}
        />
      </div>

      <div className="ckg-sum-meta">
        {match.toss && <span className="ckg-sum-meta-item">{match.toss}</span>}
        {typeof live?.currentRunRate === 'number' && (
          <span className="ckg-sum-meta-item">CRR: {live.currentRunRate.toFixed(2)}</span>
        )}
        {match.description && (
          <div className="ckg-sum-desc">{match.description}</div>
        )}
      </div>

      {match.result && (
        <div className="ckg-sum-result">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 22V13a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v9" />
            <path d="M18 2v7a6 6 0 0 1-12 0V2" />
          </svg>
          {match.result}
        </div>
      )}

      {/* Live batters / bowler preview pulled from live state */}
      {match.status === 'live' && live && (live.batsmen.length > 0 || live.bowler) && (
        <div className="ckg-sum-live-grid">
          {battingTeam && (
            <div className="ckg-sum-live-col">
              <div className="ckg-sum-live-label" style={{ color: battingTeam.color || 'inherit' }}>
                {battingTeam.shortName} batting
              </div>
              {live.batsmen.length > 0 ? (
                <div className="ckg-sum-live-list">
                  {live.batsmen.map((b, idx) => (
                    <div key={b.name} className="ckg-sum-live-line">
                      {idx === 0 && <span className="ckg-sum-strike-dot" aria-hidden>•</span>}
                      <span className="ckg-sum-live-name">{b.name}:</span>
                      <span className="ckg-sum-live-stat">
                        {b.runs}* ({b.balls})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ckg-sum-live-empty">Next pair walking in…</div>
              )}
            </div>
          )}
          {bowlingTeam && (
            <div className="ckg-sum-live-col">
              <div className="ckg-sum-live-label" style={{ color: bowlingTeam.color || 'inherit' }}>
                {bowlingTeam.shortName} bowling
              </div>
              {live.bowler ? (
                <div className="ckg-sum-live-list">
                  <div className="ckg-sum-live-line">
                    <span className="ckg-sum-live-name">{live.bowler.name}:</span>
                    <span className="ckg-sum-live-stat">
                      {live.bowler.wickets}/{live.bowler.runs} ({live.bowler.overs.toFixed(1)})
                    </span>
                    <span className="ckg-sum-strike-dot" aria-hidden>•</span>
                  </div>
                </div>
              ) : (
                <div className="ckg-sum-live-empty">Next bowler stepping up…</div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Tables
 * ────────────────────────────────────────────────────────────────────── */

function PlayerNameCell({
  name, headshot, color, isCaptain, isWicketKeeper, dismissal, notOut, liveTag,
}: {
  name: string;
  headshot?: string;
  color?: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  dismissal?: string;
  notOut?: boolean;
  liveTag?: string;
}) {
  return (
    <div className="ckg-pname">
      <PlayerAvatar name={name} headshot={headshot} color={color} />
      <div className="ckg-pname-text">
        <div className="ckg-pname-line">
          <span className="ckg-pname-main">{name}</span>
          {isWicketKeeper && <span className="ckg-pname-tag">(wk)</span>}
          {isCaptain && <span className="ckg-pname-tag">(c)</span>}
          {liveTag && (
            <span className="ckg-pname-live">
              <span className="ckg-pname-live-dot" aria-hidden />
              {liveTag}
            </span>
          )}
        </div>
        {dismissal && (
          <div className={`ckg-pname-dismissal ${notOut ? 'ckg-pname-dismissal--notout' : ''}`}>
            {dismissal}
          </div>
        )}
      </div>
    </div>
  );
}

function BattingTable({ rows, teamColor }: { rows: BattingStat[]; teamColor?: string }) {
  if (rows.length === 0) {
    return <div className="ckg-empty-row">Batting detail not available yet.</div>;
  }
  return (
    <div className="ckg-table-wrap">
      <table className="ckg-table">
        <thead>
          <tr>
            <th className="ckg-col-name">Batting</th>
            <th className="ckg-col-num">R</th>
            <th className="ckg-col-num">B</th>
            <th className="ckg-col-num">4s</th>
            <th className="ckg-col-num">6s</th>
            <th className="ckg-col-num">S/R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => {
            const live = b.active === true;
            return (
              <tr
                key={`${b.player}-${i}`}
                className={[
                  b.notOut ? 'ckg-row--notout' : '',
                  live ? 'ckg-row--live' : '',
                ].filter(Boolean).join(' ')}
              >
                <td className="ckg-col-name">
                  <PlayerNameCell
                    name={b.player}
                    headshot={b.headshot}
                    color={teamColor}
                    isCaptain={b.isCaptain}
                    isWicketKeeper={b.isWicketKeeper}
                    dismissal={b.dismissal}
                    notOut={b.notOut}
                    liveTag={live ? 'Batting' : undefined}
                  />
                </td>
                <td className="ckg-col-num ckg-num--primary">
                  {b.runs}{b.notOut ? '*' : ''}
                </td>
                <td className="ckg-col-num">{b.balls}</td>
                <td className="ckg-col-num">{b.fours}</td>
                <td className="ckg-col-num">{b.sixes}</td>
                <td className="ckg-col-num">{b.strikeRate.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ rows, teamColor }: { rows: BowlingStat[]; teamColor?: string }) {
  if (rows.length === 0) {
    return <div className="ckg-empty-row">Bowling detail not available yet.</div>;
  }
  return (
    <div className="ckg-table-wrap">
      <table className="ckg-table">
        <thead>
          <tr>
            <th className="ckg-col-name">Bowling</th>
            <th className="ckg-col-num">O</th>
            <th className="ckg-col-num">M</th>
            <th className="ckg-col-num">R</th>
            <th className="ckg-col-num">W</th>
            <th className="ckg-col-num">Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => {
            const live = b.active === true;
            return (
              <tr
                key={`${b.player}-${i}`}
                className={live ? 'ckg-row--live' : ''}
              >
                <td className="ckg-col-name">
                  <PlayerNameCell
                    name={b.player}
                    headshot={b.headshot}
                    color={teamColor}
                    isCaptain={b.isCaptain}
                    liveTag={live ? 'Bowling' : undefined}
                  />
                </td>
                <td className="ckg-col-num">{b.overs}</td>
                <td className="ckg-col-num">{b.maidens}</td>
                <td className="ckg-col-num">{b.runs}</td>
                <td className="ckg-col-num ckg-num--primary">{b.wickets}</td>
                <td className="ckg-col-num">{b.economy.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExtrasRow({ extras }: { extras?: number }) {
  if (typeof extras !== 'number') return null;
  return (
    <div className="ckg-aggregate">
      <span className="ckg-aggregate-label">Extras</span>
      <span className="ckg-aggregate-value">{extras}</span>
    </div>
  );
}

function TotalRow({ runs, wickets, overs }: { runs: number; wickets: number; overs: number }) {
  return (
    <div className="ckg-aggregate ckg-aggregate--total">
      <span className="ckg-aggregate-label">Total runs</span>
      <span className="ckg-aggregate-value">
        {runs} <span className="ckg-aggregate-sub">({wickets} wkts, {overs} ov)</span>
      </span>
    </div>
  );
}

function YetToBatRow({ players }: { players?: string[] }) {
  if (!players || players.length === 0) return null;
  return (
    <div className="ckg-block">
      <div className="ckg-block-title">Yet to bat</div>
      <div className="ckg-block-body">
        {players.join(' · ')}
      </div>
    </div>
  );
}

function FallOfWicketsRow({ rows }: { rows?: FallOfWicket[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="ckg-block">
      <div className="ckg-block-title">Fall of wickets</div>
      <div className="ckg-block-body">
        {rows.map((r, i) => (
          <span key={`${r.wicketNo}-${r.player}`} className="ckg-fow-item">
            <b>{r.runs}/{r.wicketNo}</b> ({r.player}, {r.overs} ov)
            {i < rows.length - 1 && <span className="ckg-fow-sep"> · </span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Main
 * ────────────────────────────────────────────────────────────────────── */

export default function CricketScorecard({ match }: Props) {
  const inningsList = useMemo(() => buildInningsList(match), [match]);
  const [activeIdx, setActiveIdx] = useState(0);

  if (inningsList.length === 0) {
    return (
      <div className="ckg">
        <MatchSummaryCard match={match} live={match.live} />
        <div className="ckg-empty">
          <div className="ckg-empty-title">Scorecard appears after toss</div>
          <div className="ckg-empty-sub">
            Scheduled start:{' '}
            {new Date(match.start).toLocaleString([], {
              weekday: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
        <InfoCard match={match} />
      </div>
    );
  }

  const inn = inningsList[activeIdx] ?? inningsList[0];
  const team = teamForId(match, inn.teamId);
  const teamColor = team?.color;

  return (
    <div className="ckg">
      <MatchSummaryCard match={match} live={match.live} />

      {inningsList.length > 1 && (
        <div className="ckg-inn-tabs" role="tablist" aria-label="Select innings">
          {inningsList.map((i, idx) => {
            const t = teamForId(match, i.teamId);
            return (
              <button
                key={`${i.period}-${i.teamId}`}
                type="button"
                className={`ckg-inn-tab ${idx === activeIdx ? 'active' : ''}`}
                role="tab"
                aria-selected={idx === activeIdx}
                onClick={() => setActiveIdx(idx)}
              >
                {t?.name ?? i.teamShortName}
              </button>
            );
          })}
        </div>
      )}

      <BattingTable rows={inn.batting} teamColor={teamColor} />
      <ExtrasRow extras={inn.extras} />
      <TotalRow runs={inn.runs} wickets={inn.wickets} overs={inn.overs} />
      <YetToBatRow players={inn.yetToBat} />
      <FallOfWicketsRow rows={inn.fallOfWickets} />
      <BowlingTable rows={inn.bowling} teamColor={teamForId(match, inn.teamId === match.home.id ? match.away.id : match.home.id)?.color} />

      <InfoCard match={match} />
    </div>
  );
}

function InfoCard({ match }: { match: CricketMatch }) {
  return (
    <section className="ckg-info">
      <h3 className="ckg-section-title">Match info</h3>
      <dl className="ckg-info-list">
        {match.result && (
          <div className="ckg-info-row ckg-info-row--result">
            <dt>Result</dt>
            <dd>{match.result}</dd>
          </div>
        )}
        {match.toss && (
          <div className="ckg-info-row">
            <dt>Update</dt>
            <dd>{match.toss}</dd>
          </div>
        )}
        <div className="ckg-info-row">
          <dt>Venue</dt>
          <dd>
            {match.venue}
            {match.city && match.city !== match.venue ? `, ${match.city}` : ''}
          </dd>
        </div>
        {match.description && (
          <div className="ckg-info-row">
            <dt>Match</dt>
            <dd>{match.description} · {match.leagueName}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

