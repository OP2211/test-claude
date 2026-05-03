import {
  CRICKET_LEAGUES,
  fetchCricketSeasonMatches,
} from './espn';
import type { CricketMatch, CricketTeamInfo } from './types';
import { resolveCricketTeam } from './teams';

/**
 * Top run-scorer (Orange Cap) and top wicket-taker (Purple Cap) for the season.
 * Aggregated by walking every finished IPL match's `/summary` payload and summing
 * each player's per-match batting / bowling stats. Cached for 5 minutes server-side
 * to keep ESPN traffic bounded.
 */

const ESPN_CRICKET_BASE = 'https://site.api.espn.com/apis/site/v2/sports/cricket';

export interface SeasonBattingLeader {
  athleteId: string;
  name: string;
  teamId: string;
  teamShort: string;
  teamColor: string;
  teamLogo?: string;
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOuts: number;
  highest: number;
  /** Average = runs / dismissals (innings - notOuts). 0 when never dismissed. */
  average: number;
  /** Strike rate = 100 * runs / balls. 0 when no balls faced. */
  strikeRate: number;
}

export interface SeasonBowlingLeader {
  athleteId: string;
  name: string;
  teamId: string;
  teamShort: string;
  teamColor: string;
  teamLogo?: string;
  matches: number;
  /** Total balls bowled across the season (overs accumulate as 6 balls each). */
  ballsBowled: number;
  oversText: string;
  runsConceded: number;
  wickets: number;
  /** Best bowling figures of the season — e.g. "5/24". */
  bestFigures: string;
  /** Economy = runs / overs. */
  economy: number;
  /** Average = runs / wickets, 0 when no wickets. */
  average: number;
}

export interface SeasonLeadersPayload {
  /** Sorted: highest runs first. */
  topRuns: SeasonBattingLeader[];
  /** Sorted: highest wickets first. */
  topWickets: SeasonBowlingLeader[];
  /** Number of finished matches the aggregate is built from. */
  matchesIncluded: number;
  generatedAt: string;
}

interface BatAcc {
  athleteId: string;
  name: string;
  teamId: string;
  teamShort: string;
  teamColor: string;
  teamLogo?: string;
  matchIds: Set<string>;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOuts: number;
  highest: number;
}

interface BowlAcc {
  athleteId: string;
  name: string;
  teamId: string;
  teamShort: string;
  teamColor: string;
  teamLogo?: string;
  matchIds: Set<string>;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  bestRuns: number;
  bestWickets: number;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

interface EspnStat { name: string; value?: number | string; displayValue?: string }
interface EspnInnerLs {
  batting?: { active?: boolean; outDetails?: { dismissalCard?: string; shortText?: string } };
  bowling?: unknown;
  statistics?: { categories?: Array<{ stats?: EspnStat[] }> };
}
interface EspnOuterLs { period?: number; linescores?: EspnInnerLs[] }
interface EspnRosterItem {
  athlete?: { id?: string; displayName?: string; shortName?: string; battingName?: string; headshot?: { href?: string } };
  linescores?: EspnOuterLs[];
}
interface EspnRoster {
  homeAway?: 'home' | 'away';
  team?: { id?: string; displayName?: string; logo?: string; logos?: Array<{ href?: string }>; abbreviation?: string };
  roster?: EspnRosterItem[];
}
interface EspnSummary { rosters?: EspnRoster[] }

function collectStats(ls: EspnInnerLs): EspnStat[] {
  const cats = asArray<{ stats?: EspnStat[] }>(ls.statistics?.categories);
  const out: EspnStat[] = [];
  for (const c of cats) for (const s of asArray<EspnStat>(c.stats)) out.push(s);
  return out;
}
function statValue(stats: EspnStat[], name: string): number {
  return num(stats.find((s) => s.name === name)?.value);
}
function statString(stats: EspnStat[], name: string): string {
  const f = stats.find((s) => s.name === name);
  if (typeof f?.value === 'string') return f.value;
  if (typeof f?.displayValue === 'string') return f.displayValue;
  return '';
}
function pickName(athlete: EspnRosterItem['athlete']): string {
  return athlete?.displayName || athlete?.battingName || athlete?.shortName || '';
}

/** Convert overs notation "X.Y" → total balls. (4.3 ov = 27 balls). */
function oversToBalls(overs: number): number {
  const whole = Math.floor(overs);
  const part = Math.round((overs - whole) * 10);
  return whole * 6 + Math.min(part, 6);
}
function ballsToOversText(balls: number): string {
  const whole = Math.floor(balls / 6);
  const rem = balls % 6;
  return rem === 0 ? `${whole}` : `${whole}.${rem}`;
}

async function fetchSummary(eventId: string): Promise<EspnSummary | null> {
  for (const league of CRICKET_LEAGUES) {
    try {
      const res = await fetch(
        `${ESPN_CRICKET_BASE}/${league.slug}/summary?event=${eventId}`,
        { cache: 'no-store' },
      );
      if (res.ok) return (await res.json()) as EspnSummary;
    } catch {
      /* try next league */
    }
  }
  return null;
}

function applyMatchSummary(
  summary: EspnSummary,
  match: CricketMatch,
  bat: Map<string, BatAcc>,
  bowl: Map<string, BowlAcc>,
): void {
  for (const r of asArray<EspnRoster>(summary.rosters)) {
    const side = r.homeAway;
    const teamInfo: CricketTeamInfo =
      side === 'home' ? match.home :
      side === 'away' ? match.away :
      resolveCricketTeam(r.team?.id ?? '', r.team?.displayName ?? '');
    const teamLogo = r.team?.logo
      ?? r.team?.logos?.[0]?.href
      ?? teamInfo.logo;

    for (const p of asArray<EspnRosterItem>(r.roster)) {
      const name = pickName(p.athlete);
      const athleteId = p.athlete?.id ?? '';
      if (!name || !athleteId) continue;

      // Aggregate this player's per-match best figures so we can update season bests
      let matchRunsConceded = 0;
      let matchWickets = 0;
      let matchPlayedAsBowler = false;
      let matchPlayedAsBatter = false;

      for (const outer of asArray<EspnOuterLs>(p.linescores)) {
        for (const ls of asArray<EspnInnerLs>(outer.linescores)) {
          const stats = collectStats(ls);
          // Batting: include if `batted` flag is set or we have any runs/balls (covers
          // newer payloads that omit the `batting` metadata object).
          const batted = statValue(stats, 'batted') > 0 || ls.batting !== undefined;
          if (batted) {
            const runs = statValue(stats, 'runs');
            const balls = statValue(stats, 'ballsFaced');
            if (runs > 0 || balls > 0 || ls.batting?.outDetails) {
              matchPlayedAsBatter = true;
              const fours = statValue(stats, 'fours');
              const sixes = statValue(stats, 'sixes');
              const dismissalCardRaw = statString(stats, 'dismissalCard').trim();
              const isOut =
                statValue(stats, 'outs') > 0 ||
                (dismissalCardRaw.length > 0 && dismissalCardRaw.toLowerCase() !== 'not out');
              const acc =
                bat.get(athleteId) ??
                ({
                  athleteId,
                  name,
                  teamId: teamInfo.id,
                  teamShort: teamInfo.shortName,
                  teamColor: teamInfo.color,
                  teamLogo,
                  matchIds: new Set<string>(),
                  innings: 0,
                  runs: 0,
                  balls: 0,
                  fours: 0,
                  sixes: 0,
                  notOuts: 0,
                  highest: 0,
                } satisfies BatAcc);
              acc.matchIds.add(match.id);
              acc.innings += 1;
              acc.runs += runs;
              acc.balls += balls;
              acc.fours += fours;
              acc.sixes += sixes;
              if (!isOut) acc.notOuts += 1;
              if (runs > acc.highest) acc.highest = runs;
              bat.set(athleteId, acc);
            }
          }

          // Bowling: aggregate using stats presence (overs > 0).
          const overs = statValue(stats, 'overs');
          const wickets = statValue(stats, 'wickets');
          const conceded = statValue(stats, 'conceded');
          if (overs > 0 || wickets > 0 || conceded > 0) {
            matchPlayedAsBowler = true;
            matchRunsConceded = conceded;
            matchWickets = wickets;
            const acc =
              bowl.get(athleteId) ??
              ({
                athleteId,
                name,
                teamId: teamInfo.id,
                teamShort: teamInfo.shortName,
                teamColor: teamInfo.color,
                teamLogo,
                matchIds: new Set<string>(),
                ballsBowled: 0,
                runsConceded: 0,
                wickets: 0,
                bestRuns: Number.POSITIVE_INFINITY,
                bestWickets: 0,
              } satisfies BowlAcc);
            acc.matchIds.add(match.id);
            acc.ballsBowled += oversToBalls(overs);
            acc.runsConceded += conceded;
            acc.wickets += wickets;
            // Best figures: most wickets first; if tied, fewer runs.
            if (
              wickets > acc.bestWickets ||
              (wickets === acc.bestWickets && conceded < acc.bestRuns)
            ) {
              acc.bestWickets = wickets;
              acc.bestRuns = conceded;
            }
            bowl.set(athleteId, acc);
          }
        }
      }
      // Suppress "unused" lint by using these for clarity in case we extend later.
      void matchPlayedAsBatter;
      void matchPlayedAsBowler;
      void matchRunsConceded;
      void matchWickets;
    }
  }
}

function toBattingLeaders(bat: Map<string, BatAcc>, limit: number): SeasonBattingLeader[] {
  const out: SeasonBattingLeader[] = [];
  for (const a of bat.values()) {
    const dismissals = a.innings - a.notOuts;
    const average = dismissals > 0 ? Number((a.runs / dismissals).toFixed(2)) : 0;
    const strikeRate = a.balls > 0 ? Number(((a.runs / a.balls) * 100).toFixed(2)) : 0;
    out.push({
      athleteId: a.athleteId,
      name: a.name,
      teamId: a.teamId,
      teamShort: a.teamShort,
      teamColor: a.teamColor,
      teamLogo: a.teamLogo,
      matches: a.matchIds.size,
      innings: a.innings,
      runs: a.runs,
      balls: a.balls,
      fours: a.fours,
      sixes: a.sixes,
      notOuts: a.notOuts,
      highest: a.highest,
      average,
      strikeRate,
    });
  }
  out.sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);
  return out.slice(0, limit);
}

function toBowlingLeaders(bowl: Map<string, BowlAcc>, limit: number): SeasonBowlingLeader[] {
  const out: SeasonBowlingLeader[] = [];
  for (const a of bowl.values()) {
    const overs = a.ballsBowled / 6;
    const economy = overs > 0 ? Number((a.runsConceded / overs).toFixed(2)) : 0;
    const average = a.wickets > 0 ? Number((a.runsConceded / a.wickets).toFixed(2)) : 0;
    const bestFigures =
      a.bestWickets > 0 && Number.isFinite(a.bestRuns) ? `${a.bestWickets}/${a.bestRuns}` : '—';
    out.push({
      athleteId: a.athleteId,
      name: a.name,
      teamId: a.teamId,
      teamShort: a.teamShort,
      teamColor: a.teamColor,
      teamLogo: a.teamLogo,
      matches: a.matchIds.size,
      ballsBowled: a.ballsBowled,
      oversText: ballsToOversText(a.ballsBowled),
      runsConceded: a.runsConceded,
      wickets: a.wickets,
      bestFigures,
      economy,
      average,
    });
  }
  out.sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
  return out.slice(0, limit);
}

/* ──────────────────────────────────────────────────────────────────────
 * Cache layer — TTL 5 minutes
 * ────────────────────────────────────────────────────────────────────── */

interface CacheEntry { payload: SeasonLeadersPayload; expires: number }
let cache: CacheEntry | null = null;
const TTL_MS = 5 * 60_000;
let inflight: Promise<SeasonLeadersPayload> | null = null;

export async function fetchIplSeasonLeaders(): Promise<SeasonLeadersPayload> {
  if (cache && cache.expires > Date.now()) return cache.payload;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const matches = await fetchCricketSeasonMatches();
      const finished = matches.filter((m) => m.status === 'finished' && m._espn?.eventId);
      const bat = new Map<string, BatAcc>();
      const bowl = new Map<string, BowlAcc>();
      // Walk summaries in parallel batches of 6 to keep ESPN happy.
      const batchSize = 6;
      for (let i = 0; i < finished.length; i += batchSize) {
        const batch = finished.slice(i, i + batchSize);
        const summaries = await Promise.all(
          batch.map((m) => fetchSummary(m._espn!.eventId)),
        );
        summaries.forEach((s, idx) => {
          if (s) applyMatchSummary(s, batch[idx], bat, bowl);
        });
      }
      const payload: SeasonLeadersPayload = {
        topRuns: toBattingLeaders(bat, 10),
        topWickets: toBowlingLeaders(bowl, 10),
        matchesIncluded: finished.length,
        generatedAt: new Date().toISOString(),
      };
      cache = { payload, expires: Date.now() + TTL_MS };
      return payload;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
