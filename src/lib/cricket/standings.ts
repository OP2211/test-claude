import type { CricketInnings, CricketMatch, CricketTeamInfo } from './types';

export interface IplStandingRow {
  team: CricketTeamInfo;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  /** Net Run Rate, computed when both innings totals are available; otherwise 0. */
  netRunRate: number;
}

interface RunsAndOvers {
  runs: number;
  overs: number;
}

/** Look up the winning team via ESPN's structured `winnerTeamId` field on the match. */
function detectWinner(match: CricketMatch): CricketTeamInfo | null {
  if (!match.winnerTeamId) return null;
  if (match.winnerTeamId === match.home.id) return match.home;
  if (match.winnerTeamId === match.away.id) return match.away;
  return null;
}

function isNoResult(match: CricketMatch): boolean {
  // ESPN doesn't structurally flag NR/abandoned matches, so fall back to the
  // descriptive summary text. status === 'finished' AND no winner AND wording match.
  const text = (match.result || '').toLowerCase();
  return /no result|abandoned|cancelled/.test(text) && !match.winnerTeamId;
}

function isTied(match: CricketMatch): boolean {
  // A finished match with no winner and "tied" wording — typically resolved by Super Over,
  // in which case ESPN sets winnerTeamId to the SO winner and detectWinner picks it up.
  // This only catches genuine non-SO ties (rare in T20 IPL).
  if (match.winnerTeamId) return false;
  const text = (match.result || '').toLowerCase();
  return /\btied\b|\btie\b/.test(text);
}

function inningsRunsOvers(innings: CricketInnings[], teamId: string): RunsAndOvers | null {
  const inn = innings.find((i) => i.teamId === teamId);
  if (!inn) return null;
  if (inn.runs === 0 && inn.wickets === 0 && inn.overs === 0) return null;
  return { runs: inn.runs, overs: inn.overs > 0 ? inn.overs : 20 };
}

/**
 * Compute the IPL points table from the season's finished matches.
 * - Win: 2 pts. Tied or No Result: 1 pt each. Loss: 0.
 * - NRR = (runs scored / overs faced) − (runs conceded / overs bowled), summed across innings.
 */
export function computeIplStandings(matches: CricketMatch[]): IplStandingRow[] {
  const finished = matches.filter((m) => m.status === 'finished');

  type Acc = {
    team: CricketTeamInfo;
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    runsFor: number;
    oversFor: number;
    runsAgainst: number;
    oversAgainst: number;
  };
  const acc = new Map<string, Acc>();
  const ensure = (team: CricketTeamInfo): Acc => {
    let row = acc.get(team.id);
    if (!row) {
      row = {
        team,
        played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
        runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0,
      };
      acc.set(team.id, row);
    }
    return row;
  };

  for (const match of finished) {
    const home = ensure(match.home);
    const away = ensure(match.away);

    const noResult = isNoResult(match);
    const tied = !noResult && isTied(match);
    const winner = !noResult && !tied ? detectWinner(match) : null;

    home.played += 1;
    away.played += 1;

    if (noResult) {
      home.noResult += 1;
      away.noResult += 1;
    } else if (tied) {
      home.tied += 1;
      away.tied += 1;
    } else if (winner) {
      if (winner.id === match.home.id) {
        home.won += 1;
        away.lost += 1;
      } else if (winner.id === match.away.id) {
        away.won += 1;
        home.lost += 1;
      }
    }

    // NRR contributions — only when both teams have a valid innings.
    const homeInn = inningsRunsOvers(match.innings, match.home.id);
    const awayInn = inningsRunsOvers(match.innings, match.away.id);
    if (homeInn && awayInn) {
      home.runsFor += homeInn.runs;
      home.oversFor += homeInn.overs;
      home.runsAgainst += awayInn.runs;
      home.oversAgainst += awayInn.overs;
      away.runsFor += awayInn.runs;
      away.oversFor += awayInn.overs;
      away.runsAgainst += homeInn.runs;
      away.oversAgainst += homeInn.overs;
    }
  }

  const rows: IplStandingRow[] = [];
  for (const a of acc.values()) {
    const points = a.won * 2 + a.tied + a.noResult;
    const rrFor = a.oversFor > 0 ? a.runsFor / a.oversFor : 0;
    const rrAgainst = a.oversAgainst > 0 ? a.runsAgainst / a.oversAgainst : 0;
    const netRunRate = Number((rrFor - rrAgainst).toFixed(3));
    rows.push({
      team: a.team,
      played: a.played,
      won: a.won,
      lost: a.lost,
      tied: a.tied,
      noResult: a.noResult,
      points,
      netRunRate,
    });
  }

  // Standard IPL ordering: points desc, then NRR desc, then W desc, alpha tiebreaker.
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
    if (b.won !== a.won) return b.won - a.won;
    return a.team.shortName.localeCompare(b.team.shortName);
  });

  return rows;
}
