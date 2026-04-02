'use client';

import { useMemo } from 'react';
import type { VoteHistoryPoint } from '@/lib/types';
import './VoteTimelineChart.css';

interface VoteTimelineChartProps {
  history: VoteHistoryPoint[];
  homeLabel: string;
  awayLabel: string;
}

const W = 300;
const H = 118;
const PAD = { l: 30, r: 10, t: 12, b: 26 };

/** Step chart: counts stay flat until the next vote, then jump vertically. */
function buildStepPath(
  pts: { t: number; v: number }[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  maxY: number
): string {
  if (pts.length === 0) return '';
  const xw = x1 - x0;
  const yh = y0 - y1;
  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  const span = Math.max(tMax - tMin, 1);
  const nx = (t: number) => x0 + ((t - tMin) / span) * xw;
  const ny = (v: number) => y0 - (maxY > 0 ? (v / maxY) * yh : 0);

  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const x = nx(pts[i].t);
    const y = ny(pts[i].v);
    if (i === 0) d += `M ${x} ${y}`;
    else {
      const py = ny(pts[i - 1].v);
      d += ` L ${x} ${py} L ${x} ${y}`;
    }
  }
  d += ` L ${x1} ${ny(pts[pts.length - 1].v)}`;
  return d;
}

export default function VoteTimelineChart({ history, homeLabel, awayLabel }: VoteTimelineChartProps) {
  const prepared = useMemo(() => {
    if (history.length === 0) return null;
    const tFirst = new Date(history[0].at).getTime();
    const times = [tFirst - 1, ...history.map(h => new Date(h.at).getTime())];
    const z: { home: number; draw: number; away: number } = { home: 0, draw: 0, away: 0 };
    const tallies = [z, ...history.map(h => h.tally)];
    const ptsHome = times.map((t, i) => ({ t, v: tallies[i].home }));
    const ptsDraw = times.map((t, i) => ({ t, v: tallies[i].draw }));
    const ptsAway = times.map((t, i) => ({ t, v: tallies[i].away }));
    const maxY = Math.max(1, ...tallies.flatMap(t => [t.home, t.draw, t.away]));
    return { ptsHome, ptsDraw, ptsAway, maxY };
  }, [history]);

  const x0 = PAD.l;
  const x1 = W - PAD.r;
  const y0 = H - PAD.b;
  const y1 = PAD.t;

  if (!prepared) {
    return (
      <div className="vtc vtc--empty">
        <p className="vtc-empty-text">This chart fills in as votes roll in.</p>
      </div>
    );
  }

  const { ptsHome, ptsDraw, ptsAway, maxY } = prepared;
  const pH = buildStepPath(ptsHome, x0, x1, y0, y1, maxY);
  const pD = buildStepPath(ptsDraw, x0, x1, y0, y1, maxY);
  const pA = buildStepPath(ptsAway, x0, x1, y0, y1, maxY);

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxY * i) / ticks));

  return (
    <div className="vtc">
      <p className="vtc-title">Votes over time</p>
      <svg
        className="vtc-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Step chart of home, draw, and away vote counts over time"
      >
        {tickVals.map((val, i) => {
          const fr = i / ticks;
          const y = y0 - fr * (y0 - y1);
          return (
            <g key={i}>
              <line className="vtc-grid" x1={x0} x2={x1} y1={y} y2={y} />
              <text className="vtc-ytick" x={x0 - 5} y={y + 3.5} textAnchor="end">
                {val}
              </text>
            </g>
          );
        })}
        <path className="vtc-line vtc-line--away" d={pA} fill="none" vectorEffect="non-scaling-stroke" />
        <path className="vtc-line vtc-line--draw" d={pD} fill="none" vectorEffect="non-scaling-stroke" />
        <path className="vtc-line vtc-line--home" d={pH} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="vtc-legend">
        <span className="vtc-legend-item">
          <i className="vtc-dot vtc-dot--home" />
          {homeLabel}
        </span>
        <span className="vtc-legend-item">
          <i className="vtc-dot vtc-dot--draw" />
          Draw
        </span>
        <span className="vtc-legend-item">
          <i className="vtc-dot vtc-dot--away" />
          {awayLabel}
        </span>
      </div>
    </div>
  );
}
