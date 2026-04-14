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
  confirmed: boolean;
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
  /** ESPN internal metadata - used to fetch rosters on demand */
  _espn?: {
    homeTeamId: string;
    awayTeamId: string;
    leagueSlug: string;
  };
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
  name?: string;
  username: string;
  fanTeamId: TeamId | null;
  email?: string;
  image?: string;
  mobileNumber?: string;
}

export interface ProfileRow {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile_number: string;
  team: string;
  avatar_url: string | null;
}
