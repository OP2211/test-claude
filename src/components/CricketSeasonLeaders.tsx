'use client';

import { useEffect, useState } from 'react';
import type {
  SeasonBattingLeader,
  SeasonBowlingLeader,
  SeasonLeadersPayload,
} from '@/lib/cricket/season-leaders';
import './CricketSeasonLeaders.css';

export default function CricketSeasonLeaders() {
  const [data, setData] = useState<SeasonLeadersPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/cricket/season-leaders', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as SeasonLeadersPayload;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load stats');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="cksl-empty">Couldn’t load stats: {error}</div>;
  if (!data) {
    return (
      <div className="cksl-loading">
        <div className="cksl-spinner" />
        Crunching every match summary....
      </div>
    );
  }
  if (data.matchesIncluded === 0) {
    return <div className="cksl-empty">No completed IPL matches yet this season.</div>;
  }

  const orange = data.topRuns[0];
  const purple = data.topWickets[0];

  return (
    <div className="cksl">
      <div className="cksl-cap-grid">
        <CapCard
          tone="orange"
          title="Orange Cap"
          subtitle="Top run-scorer"
          leader={orange}
          format={(b) => (
            <>
              <span className="cksl-cap-big">{b.runs}</span>
              <span className="cksl-cap-unit">runs</span>
            </>
          )}
          extras={(b) => `${b.matches} M · ${b.innings} inn · SR ${b.strikeRate.toFixed(2)} · HS ${b.highest}`}
        />
        <CapCard
          tone="purple"
          title="Purple Cap"
          subtitle="Top wicket-taker"
          leader={purple}
          format={(b) => (
            <>
              <span className="cksl-cap-big">{b.wickets}</span>
              <span className="cksl-cap-unit">wkts</span>
            </>
          )}
          extras={(b) =>
            `${b.matches} M · ${b.oversText} ov · Econ ${b.economy.toFixed(2)} · Best ${b.bestFigures}`
          }
        />
      </div>

      <section className="cksl-section">
        <h3 className="cksl-section-title">
          <span className="cksl-section-pill cksl-section-pill--orange">🏏 Orange Cap</span>
          Top run-scorers
        </h3>
        <BattingTable rows={data.topRuns} />
      </section>

      <section className="cksl-section">
        <h3 className="cksl-section-title">
          <span className="cksl-section-pill cksl-section-pill--purple">🎯 Purple Cap</span>
          Top wicket-takers
        </h3>
        <BowlingTable rows={data.topWickets} />
      </section>

      <p className="cksl-note">
        Built from {data.matchesIncluded} completed match{data.matchesIncluded === 1 ? '' : 'es'}.
        Cached for 5 minutes — Cricinfo is the source of truth.
      </p>
    </div>
  );
}

interface CapCardProps<T> {
  tone: 'orange' | 'purple';
  title: string;
  subtitle: string;
  leader?: T;
  format: (l: T) => React.ReactNode;
  extras: (l: T) => string;
}

function CapCard<T extends { name: string; teamShort: string; teamColor: string; teamLogo?: string }>({
  tone, title, subtitle, leader, format, extras,
}: CapCardProps<T>) {
  if (!leader) {
    return (
      <div className={`cksl-cap cksl-cap--${tone}`}>
        <div className="cksl-cap-head">
          <span className="cksl-cap-title">{title}</span>
          <span className="cksl-cap-sub">{subtitle}</span>
        </div>
        <div className="cksl-cap-empty">No data yet</div>
      </div>
    );
  }
  return (
    <div className={`cksl-cap cksl-cap--${tone}`}>
      <div className="cksl-cap-head">
        <span className="cksl-cap-title">{title}</span>
        <span className="cksl-cap-sub">{subtitle}</span>
      </div>
      <div className="cksl-cap-body">
        <div className="cksl-cap-name">
          <span
            className="cksl-cap-crest"
            style={{ background: leader.teamColor || '#334779' }}
            title={leader.teamShort}
          >
            {leader.teamLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leader.teamLogo} alt="" />
            ) : (
              <span>{leader.teamShort.slice(0, 3)}</span>
            )}
          </span>
          <div>
            <div className="cksl-cap-player">{leader.name}</div>
            <div className="cksl-cap-team">{leader.teamShort}</div>
          </div>
        </div>
        <div className="cksl-cap-stat">{format(leader)}</div>
      </div>
      <div className="cksl-cap-extras">{extras(leader)}</div>
    </div>
  );
}

function PlayerCell({
  name, teamShort, teamColor, teamLogo,
}: { name: string; teamShort: string; teamColor: string; teamLogo?: string }) {
  return (
    <div className="cksl-pname">
      <span className="cksl-pname-crest" style={{ background: teamColor || '#334779' }}>
        {teamLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teamLogo} alt="" />
        ) : (
          <span>{teamShort.slice(0, 3)}</span>
        )}
      </span>
      <div className="cksl-pname-text">
        <div className="cksl-pname-name">{name}</div>
        <div className="cksl-pname-team">{teamShort}</div>
      </div>
    </div>
  );
}

function BattingTable({ rows }: { rows: SeasonBattingLeader[] }) {
  if (rows.length === 0) {
    return <div className="cksl-empty-row">No batting data yet.</div>;
  }
  return (
    <div className="cksl-table-wrap">
      <table className="cksl-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="cksl-col-name">Player</th>
            <th>M</th>
            <th>Inn</th>
            <th className="cksl-col-prim">Runs</th>
            <th>Avg</th>
            <th>SR</th>
            <th>HS</th>
            <th>4s</th>
            <th>6s</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.athleteId}>
              <td className="cksl-col-rank">{i + 1}</td>
              <td className="cksl-col-name">
                <PlayerCell name={r.name} teamShort={r.teamShort} teamColor={r.teamColor} teamLogo={r.teamLogo} />
              </td>
              <td>{r.matches}</td>
              <td>{r.innings}</td>
              <td className="cksl-col-prim">{r.runs}</td>
              <td>{r.average.toFixed(1)}</td>
              <td>{r.strikeRate.toFixed(1)}</td>
              <td>{r.highest}</td>
              <td>{r.fours}</td>
              <td>{r.sixes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ rows }: { rows: SeasonBowlingLeader[] }) {
  if (rows.length === 0) {
    return <div className="cksl-empty-row">No bowling data yet.</div>;
  }
  return (
    <div className="cksl-table-wrap">
      <table className="cksl-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="cksl-col-name">Player</th>
            <th>M</th>
            <th>Ov</th>
            <th>R</th>
            <th className="cksl-col-prim">W</th>
            <th>Best</th>
            <th>Avg</th>
            <th>Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.athleteId}>
              <td className="cksl-col-rank">{i + 1}</td>
              <td className="cksl-col-name">
                <PlayerCell name={r.name} teamShort={r.teamShort} teamColor={r.teamColor} teamLogo={r.teamLogo} />
              </td>
              <td>{r.matches}</td>
              <td>{r.oversText}</td>
              <td>{r.runsConceded}</td>
              <td className="cksl-col-prim">{r.wickets}</td>
              <td>{r.bestFigures}</td>
              <td>{r.average.toFixed(1)}</td>
              <td>{r.economy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
