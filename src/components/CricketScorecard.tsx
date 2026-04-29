'use client';

import { useMemo, useState } from 'react';
import type {
  BattingStat,
  BowlingStat,
  CricketMatch,
  CricketTeamInfo,
  InningsDetail,
} from '@/lib/cricket/types';
import './CricketScorecard.css';

interface Props {
  match: CricketMatch;
}

function teamByInnings(match: CricketMatch, teamId: string): CricketTeamInfo {
  return teamId === match.home.id ? match.home : match.away;
}

function buildInningsList(match: CricketMatch): InningsDetail[] {
  if (match.inningsDetail && match.inningsDetail.length > 0) {
    return match.inningsDetail;
  }
  // Fallback: synthesize from basic innings (no batter/bowler detail yet)
  return match.innings.map((i) => {
    const team = teamByInnings(match, i.teamId);
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

function BattingTable({ rows }: { rows: BattingStat[] }) {
  if (rows.length === 0) {
    return (
      <div className="ckg-empty-row">Batting detail not available yet.</div>
    );
  }
  return (
    <div className="ckg-table-wrap">
      <table className="ckg-table">
        <thead>
          <tr>
            <th className="ckg-col-name">Batter</th>
            <th className="ckg-col-num">R</th>
            <th className="ckg-col-num">B</th>
            <th className="ckg-col-num">4s</th>
            <th className="ckg-col-num">6s</th>
            <th className="ckg-col-num">SR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={`${b.player}-${i}`} className={b.notOut ? 'ckg-row--notout' : ''}>
              <td className="ckg-col-name">
                <div className="ckg-name">
                  {b.player}
                  {b.notOut && <span className="ckg-notout-star" aria-hidden>*</span>}
                </div>
                <div className="ckg-dismissal">{b.dismissal}</div>
              </td>
              <td className="ckg-col-num ckg-num--primary">{b.runs}</td>
              <td className="ckg-col-num">{b.balls}</td>
              <td className="ckg-col-num">{b.fours}</td>
              <td className="ckg-col-num">{b.sixes}</td>
              <td className="ckg-col-num">{b.strikeRate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ rows }: { rows: BowlingStat[] }) {
  if (rows.length === 0) {
    return <div className="ckg-empty-row">Bowling detail not available yet.</div>;
  }
  return (
    <div className="ckg-table-wrap">
      <table className="ckg-table">
        <thead>
          <tr>
            <th className="ckg-col-name">Bowler</th>
            <th className="ckg-col-num">O</th>
            <th className="ckg-col-num">M</th>
            <th className="ckg-col-num">R</th>
            <th className="ckg-col-num">W</th>
            <th className="ckg-col-num">Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={`${b.player}-${i}`}>
              <td className="ckg-col-name"><div className="ckg-name">{b.player}</div></td>
              <td className="ckg-col-num">{b.overs}</td>
              <td className="ckg-col-num">{b.maidens}</td>
              <td className="ckg-col-num">{b.runs}</td>
              <td className="ckg-col-num ckg-num--primary">{b.wickets}</td>
              <td className="ckg-col-num">{b.economy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InningsHeader({
  match, innings,
}: { match: CricketMatch; innings: InningsDetail }) {
  const team = teamByInnings(match, innings.teamId);
  const color = team.color || '#334779';
  return (
    <div className="ckg-inn-header" style={{ borderLeftColor: color }}>
      <div className="ckg-inn-crest" style={{ background: color }}>
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" />
        ) : (
          <span>{team.shortName.slice(0, 3)}</span>
        )}
      </div>
      <div className="ckg-inn-meta">
        <div className="ckg-inn-team">{team.name}</div>
        <div className="ckg-inn-subtitle">
          {innings.isBatting ? 'Batting now' : 'Innings complete'}
        </div>
      </div>
      <div className="ckg-inn-score">
        <span className="ckg-inn-runs">{innings.runs}</span>
        <span className="ckg-inn-slash">/</span>
        <span className="ckg-inn-wkts">{innings.wickets}</span>
        <span className="ckg-inn-overs">{innings.overs} ov</span>
      </div>
    </div>
  );
}

export default function CricketScorecard({ match }: Props) {
  const inningsList = useMemo(() => buildInningsList(match), [match]);
  const [activeIdx, setActiveIdx] = useState(0);

  if (inningsList.length === 0) {
    return (
      <div className="ckg">
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

  return (
    <div className="ckg">
      {/* Innings selector pills */}
      {inningsList.length > 1 && (
        <div className="ckg-inn-tabs" role="tablist" aria-label="Select innings">
          {inningsList.map((i, idx) => {
            const team = teamByInnings(match, i.teamId);
            const label = `${team.shortName} — ${i.runs}/${i.wickets}`;
            return (
              <button
                key={`${i.period}-${i.teamId}`}
                type="button"
                className={`ckg-inn-tab ${idx === activeIdx ? 'active' : ''}`}
                role="tab"
                aria-selected={idx === activeIdx}
                onClick={() => setActiveIdx(idx)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <InningsHeader match={match} innings={inn} />

      <section className="ckg-section">
        <h3 className="ckg-section-title">Batting</h3>
        <BattingTable rows={inn.batting} />
      </section>

      <section className="ckg-section">
        <h3 className="ckg-section-title">Bowling</h3>
        <BowlingTable rows={inn.bowling} />
      </section>

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
