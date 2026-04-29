import type { TeamId } from '@/lib/types';

export type Sport = 'football' | 'cricket';

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
  /** e.g. "Captain", "Wicket-keeper" — shown as a small badge if set */
  badge?: string;
}

export interface BattingStat {
  player: string;
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
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface InningsDetail {
  period: number;
  teamId: TeamId;
  teamShortName: string;
  runs: number;
  wickets: number;
  overs: number;
  extras?: number;
  isBatting: boolean;
  batting: BattingStat[];
  bowling: BowlingStat[];
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
  leaders?: CricketLeader[];
  /** Detailed per-innings data, populated when /summary has been fetched. */
  inningsDetail?: InningsDetail[];
  /** Playing XI per side, populated when /summary has been fetched. */
  squad?: {
    home: SquadPlayer[];
    away: SquadPlayer[];
  };
  _espn?: { eventId: string };
}
