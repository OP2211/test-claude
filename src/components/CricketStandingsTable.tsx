'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IplStandingRow } from '@/lib/cricket/standings';
import './CricketStandingsTable.css';

const PLAYOFF_CUTOFF = 4;

function timeAgo(date: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function CricketStandingsTable() {
  const [rows, setRows] = useState<IplStandingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, force] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch('/api/cricket/standings', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { standings: IplStandingRow[] };
      setRows(data.standings);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load table');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Tick once a second so the "X ago" label updates without re-fetching.
  useEffect(() => {
    if (!lastFetched) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [lastFetched]);

  if (error) {
    return <div className="cks-empty">Couldn’t load the table: {error}</div>;
  }
  if (!rows) {
    return (
      <div className="cks-loading">
        <div className="cks-spinner" /> Loading IPL points table…
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className="cks-empty">No completed IPL matches yet this season.</div>;
  }

  return (
    <div className="cks">
      <header className="cks-head">
        <div className="cks-head-titles">
          <h2 className="cks-title">IPL Points Table</h2>
          <p className="cks-sub">
            Top {PLAYOFF_CUTOFF} qualify for the playoffs · Win = 2 pts · Tied / NR = 1 pt
          </p>
        </div>
        <button
          type="button"
          className={`cks-refresh ${refreshing ? 'cks-refresh--spinning' : ''}`}
          onClick={() => { void load(true); }}
          aria-label="Refresh standings"
          title="Refresh"
          disabled={refreshing}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a9 9 0 0 1-15.4 6.36L3 16" />
            <path d="M3 12a9 9 0 0 1 15.4-6.36L21 8" />
            <polyline points="21 3 21 8 16 8" />
            <polyline points="3 21 3 16 8 16" />
          </svg>
          <span>{lastFetched ? `Updated ${timeAgo(lastFetched)}` : 'Refresh'}</span>
        </button>
      </header>

      <div className="cks-table-wrap">
        <table className="cks-table">
          <thead>
            <tr>
              <th className="cks-col-rank" aria-label="Rank">#</th>
              <th className="cks-col-team">Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th className="cks-col-hide-sm">T</th>
              <th className="cks-col-hide-sm">NR</th>
              <th className="cks-col-nrr">NRR</th>
              <th className="cks-col-pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const inPlayoffs = rank <= PLAYOFF_CUTOFF;
              return (
                <tr
                  key={row.team.id}
                  className={inPlayoffs ? 'cks-row--playoff' : ''}
                  style={{ '--team-color': row.team.color || '#334779' } as React.CSSProperties}
                >
                  <td className="cks-col-rank">
                    <span className={`cks-rank-chip ${inPlayoffs ? 'cks-rank-chip--qual' : ''}`}>
                      {rank}
                    </span>
                  </td>
                  <td className="cks-col-team">
                    <div className="cks-team">
                      <span className="cks-team-crest" style={{ background: row.team.color || '#334779' }}>
                        {row.team.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.team.logo} alt="" />
                        ) : (
                          <span>{row.team.shortName.slice(0, 3)}</span>
                        )}
                      </span>
                      <div className="cks-team-text">
                        <span className="cks-team-short">{row.team.shortName}</span>
                        <span className="cks-team-full">{row.team.name}</span>
                      </div>
                    </div>
                  </td>
                  <td>{row.played}</td>
                  <td className="cks-col-win">{row.won}</td>
                  <td>{row.lost}</td>
                  <td className="cks-col-hide-sm">{row.tied}</td>
                  <td className="cks-col-hide-sm">{row.noResult}</td>
                  <td className="cks-col-nrr">
                    {row.netRunRate >= 0 ? '+' : ''}{row.netRunRate.toFixed(3)}
                  </td>
                  <td className="cks-col-pts">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="cks-legend">
        <span className="cks-legend-dot" /> Top {PLAYOFF_CUTOFF} progress to playoffs
      </p>
    </div>
  );
}
