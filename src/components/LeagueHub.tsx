'use client';

import { useState, useEffect } from 'react';
import type { StandingEntry, TopScorer } from '@/lib/espn';
import TeamLogoImage from './TeamLogoImage';
import './LeagueHub.css';

type Tab = 'table' | 'scorers';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function StandingsTable({ standings }: { standings: StandingEntry[] }) {
  return (
    <div className="lh-table-wrap">
      <table className="lh-table">
        <thead>
          <tr>
            <th className="lh-th lh-th-pos">#</th>
            <th className="lh-th lh-th-team">Team</th>
            <th className="lh-th lh-th-num">P</th>
            <th className="lh-th lh-th-num">W</th>
            <th className="lh-th lh-th-num">D</th>
            <th className="lh-th lh-th-num">L</th>
            <th className="lh-th lh-th-num lh-hide-sm">GF</th>
            <th className="lh-th lh-th-num lh-hide-sm">GA</th>
            <th className="lh-th lh-th-num">GD</th>
            <th className="lh-th lh-th-num lh-th-pts">Pts</th>
            <th className="lh-th lh-th-next lh-hide-sm">Next</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(s => (
            <tr key={s.teamId} className="lh-row">
              <td className="lh-td lh-td-pos">
                {s.note && <span className="lh-note-dot" style={{ background: `#${s.note.color}` }} title={s.note.description} />}
                {s.position}
              </td>
              <td className="lh-td lh-td-team">
                <TeamLogoImage src={s.logo} alt="" className="lh-team-logo" />
                <span className="lh-team-name">{s.teamShortName}</span>
                <span className="lh-team-abbr">{s.teamAbbr}</span>
              </td>
              <td className="lh-td lh-td-num">{s.played}</td>
              <td className="lh-td lh-td-num">{s.wins}</td>
              <td className="lh-td lh-td-num">{s.draws}</td>
              <td className="lh-td lh-td-num">{s.losses}</td>
              <td className="lh-td lh-td-num lh-hide-sm">{s.goalsFor}</td>
              <td className="lh-td lh-td-num lh-hide-sm">{s.goalsAgainst}</td>
              <td className="lh-td lh-td-num" style={{ color: s.goalDifference > 0 ? 'var(--color-success)' : s.goalDifference < 0 ? 'var(--color-live)' : undefined }}>
                {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
              </td>
              <td className="lh-td lh-td-num lh-td-pts">{s.points}</td>
              <td className="lh-td lh-td-next lh-hide-sm">
                {s.nextMatch ? (
                  <div className="lh-next">
                    <TeamLogoImage src={s.nextMatch.opponentLogo} alt="" className="lh-next-logo" />
                    <span className="lh-next-info">
                      <span className="lh-next-opp">
                        {s.nextMatch.isHome ? 'vs' : '@'} {s.nextMatch.opponent}
                      </span>
                      <span className="lh-next-date">{formatDate(s.nextMatch.date)}</span>
                    </span>
                  </div>
                ) : (
                  <span className="lh-next-tbd">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopScorersList({ scorers }: { scorers: TopScorer[] }) {
  return (
    <div className="lh-scorers">
      {scorers.map(s => (
        <div key={s.playerId} className="lh-scorer-row">
          <span className="lh-scorer-rank">{s.rank}</span>
          <TeamLogoImage src={s.teamLogo} alt="" className="lh-scorer-team-logo" />
          <div className="lh-scorer-info">
            <span className="lh-scorer-name">{s.playerName}</span>
            <span className="lh-scorer-team">{s.teamName}</span>
          </div>
          <div className="lh-scorer-stats">
            <span className="lh-scorer-goals">{s.goals}</span>
            <span className="lh-scorer-label">goals</span>
          </div>
          <div className="lh-scorer-stats lh-hide-sm">
            <span className="lh-scorer-assists">{s.assists}</span>
            <span className="lh-scorer-label">ast</span>
          </div>
          <div className="lh-scorer-stats lh-hide-sm">
            <span className="lh-scorer-apps">{s.appearances}</span>
            <span className="lh-scorer-label">app</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeagueHub() {
  
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [standingsRes, scorersRes] = await Promise.all([
          fetch('/api/standings'),
          fetch('/api/top-scorers'),
        ]);
        const [standingsData, scorersData] = await Promise.all([
          standingsRes.json(),
          scorersRes.json(),
        ]);
        setStandings(standingsData);
        
      } catch (err) {
        console.error('Failed to load league hub data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="lh-root">
      <div className="lh-header">
        <h2 className="lh-title">Premier League</h2>
        
      </div>

      {loading ? (
        <div className="lh-loading">
          <div className="lh-spinner" />
        </div>
      ) : (
        <>
          <StandingsTable standings={standings} />
          
        </>
      )}
    </section>
  );
}
