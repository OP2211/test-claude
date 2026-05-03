export type TeamId = string;

export interface Team {
  name: string;
  shortName: string;
  badge: string;
  color: string;
  logo?: string;
}

export interface TeamSheet {
  formation: string;
  players: string[];
  /** Position abbreviation for each player (same order as players[]). */
  positions?: string[];
  /** Shirt numbers for starters (same order as players[]). Omitted or empty string when unknown. */
  numbers?: string[];
  subs?: string[];
  confirmed: boolean;
}

export interface MatchEvent {
  type: 'goal' | 'red-card' | 'yellow-card' | 'substitution' | 'other';
  clock: string;
  teamId: 'home' | 'away';
  player: string;
  assist?: string;
  detail?: string;
}

export interface Match {
  id: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  kickoff: string;
  competition: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  clock?: string;
  teamSheet: {
    home: TeamSheet;
    away: TeamSheet;
  };
  /** Key match events (goals, red cards). */
  events?: MatchEvent[];
  /** ESPN internal metadata - used to fetch rosters on demand */
  _espn?: {
    homeTeamId: string;
    awayTeamId: string;
    leagueSlug: string;
  };
  isDemo?: boolean;
}

export type TabId = 'predictions' | 'teamsheet' | 'banter';

export type VoteChoice = 'home' | 'draw' | 'away';

export interface VoteTally {
  home: number;
  draw: number;
  away: number;
}

/** Voter shown on result rows (avatar + %) */
export interface VoteVoter {
  userId: string;
  username: string;
  image?: string;
  fanTeamId: TeamId | null;
}

/** One point after a vote changes the tally (for time-series chart). */
export interface VoteHistoryPoint {
  at: string;
  tally: VoteTally;
}

export interface VoteSnapshot {
  tally: VoteTally;
  byChoice: Record<VoteChoice, VoteVoter[]>;
  history: VoteHistoryPoint[];
}

export interface Reactions {
  [emoji: string]: string[];
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  fanTeamId: TeamId | null;
  image?: string;
  tab: TabId;
  text: string;
  timestamp: string;
  reactions: Reactions;
  moderation?: {
    moderated: boolean;
    reason: string;
    by: 'admin';
  };
}

export interface User {
  userId: string;
  username: string;
  profileUsername?: string;
  fanTeamId: TeamId | null;
  /** Cricket fan team — separate from football fanTeamId. Null until user picks one. */
  cricketFanTeamId?: TeamId | null;
  email?: string;
  image?: string;
  phone?: string;
  dob?: string | null;
  city?: string | null;
  googleSub?: string;
}
