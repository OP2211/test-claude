import type { TeamId } from '@/lib/types';

export type Sport = 'football' | 'cricket';

/**
 * Banter / chat is open from 2h before start until ~6h after. Mirrors the
 * football window in MatchList.tsx (T20s last ~3.5h so we give a bit more buffer).
 * Pure function — safe to call from server and client.
 */
export function isCricketChatOpen(match: { status: 'upcoming' | 'live' | 'finished'; start: string }): boolean {
  if (match.status === 'live') return true;
  const now = Date.now();
  const start = new Date(match.start).getTime();
  if (Number.isNaN(start)) return false;
  const minsFromStart = (now - start) / 60_000;
  // Open 2h before start (negative = before)
  if (minsFromStart >= -120 && minsFromStart <= 0) return true;
  // Past start — keep open for ~4h (T20 + interval buffer) even if ESPN is slow to flip status
  if (minsFromStart > 0 && minsFromStart <= 240) return true;
  // After finish, keep banter alive for 2 more hours
  if (match.status === 'finished' && minsFromStart <= 360) return true;
  return false;
}

export type CricketLeagueSlug = 'ipl';

export interface CricketTeamInfo {
  id: TeamId;
  espnId: string;
  name: string;
  shortName: string;
  color: string;
  logo?: string;
}

export interface CricketInnings {
  period: number;
  teamId: TeamId;
  runs: number;
  wickets: number;
  overs: number;
  isBatting: boolean;
  /** Short score string as provided by ESPN (e.g. "186/4 (20 ov)"). */
  display?: string;
}

export interface CricketLeader {
  label: string;
  athlete: string;
  value: string;
  teamId: TeamId | null;
}

export type PlayerRole = 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper' | 'unknown';

export interface SquadPlayer {
  id: string;
  name: string;
  displayName: string;
  role: PlayerRole;
  /** Headshot photo URL from ESPN, when available. */
  headshot?: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  /** e.g. "C", "WK", "C & WK" — shown as a small badge if set */
  badge?: string;
}

export interface BattingStat {
  player: string;
  /** ESPN headshot URL when available */
  headshot?: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  /** Batting position (1 = opener, 11 = last). Used for scorecard sort order. */
  order?: number;
  /** True when this batter is currently at the crease right now (live). */
  active?: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  /** Dismissal text: "b Bumrah", "c Pant b Chahal", "not out" */
  dismissal: string;
  /** True when still batting / unbeaten */
  notOut: boolean;
}

export interface BowlingStat {
  player: string;
  headshot?: string;
  isCaptain?: boolean;
  /** Bowling order (1 = opening bowler, ascending). */
  order?: number;
  /** True when this bowler is bowling right now (live). */
  active?: boolean;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface FallOfWicket {
  /** Wicket number (1, 2, 3 …) */
  wicketNo: number;
  /** Cumulative team score at the moment the wicket fell */
  runs: number;
  /** Over notation (e.g. 6.4 = 4th ball of the 7th over) */
  overs: number;
  /** Batter who got out */
  player: string;
}

export interface LiveBatsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  /** Last balls faced by this batter (most-recent last). Strings like "0", "1", "4", "6", "W". */
  recentBalls: string[];
}

export interface LiveBowler {
  name: string;
  /** Innings totals (cumulative) */
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  /** Just this spell, when ESPN exposes it */
  thisSpell?: {
    overs: number;
    runs: number;
    wickets: number;
    maidens: number;
  };
}

export interface LiveState {
  /** Team currently batting (their id maps to home or away on the match). */
  battingTeamId: TeamId | null;
  bowlingTeamId: TeamId | null;
  batsmen: LiveBatsman[];
  bowler: LiveBowler | null;
  /** Cumulative innings runs for the batting team this innings, if computable. */
  inningsRuns?: number;
  inningsWickets?: number;
  inningsOvers?: number;
  /** Computed runs / over for the current innings. */
  currentRunRate?: number;
}

export interface InningsDetail {
  period: number;
  teamId: TeamId;
  teamShortName: string;
  runs: number;
  wickets: number;
  overs: number;
  /** Total extras (only the aggregate — ESPN doesn't expose B/LB/W/NB structurally). */
  extras?: number;
  isBatting: boolean;
  batting: BattingStat[];
  bowling: BowlingStat[];
  /** Players from this team who haven't batted (dismissed or active batters excluded). */
  yetToBat?: string[];
  fallOfWickets?: FallOfWicket[];
  /** Short display like "186/4 (20 ov)" as provided by ESPN. */
  display?: string;
}

export interface CricketMatch {
  id: string;
  sport: 'cricket';
  league: CricketLeagueSlug;
  leagueName: string;
  home: CricketTeamInfo;
  away: CricketTeamInfo;
  start: string;
  status: 'upcoming' | 'live' | 'finished';
  /** ESPN's short description, e.g. "30th Match (N)". */
  description?: string;
  venue: string;
  city?: string;
  innings: CricketInnings[];
  toss?: string;
  result?: string;
  /** Winning team's id when the match has finished, otherwise null. Sourced from
   *  ESPN's structured `competitor.winner` flag — far more reliable than parsing
   *  the result text. */
  winnerTeamId?: string | null;
  leaders?: CricketLeader[];
  /** Detailed per-innings data, populated when /summary has been fetched. */
  inningsDetail?: InningsDetail[];
  /** Playing XI per side, populated when /summary has been fetched. */
  squad?: {
    home: SquadPlayer[];
    away: SquadPlayer[];
  };
  /** Currently-at-the-crease batters + currently-bowling — set only when status === 'live'. */
  live?: LiveState;
  _espn?: { eventId: string };
}
