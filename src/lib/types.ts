export type TeamId =
  | 'manchester-united' | 'liverpool' | 'arsenal' | 'chelsea'
  | 'manchester-city' | 'tottenham' | 'barcelona' | 'real-madrid'
  | 'bayern-munich' | 'juventus';

export interface Team {
  name: string;
  shortName: string;
  badge: string;
  color: string;
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
  teamSheet: {
    home: TeamSheet;
    away: TeamSheet;
  };
}

export type TabId = 'predictions' | 'teamsheet' | 'banter';

export type VoteChoice = 'home' | 'draw' | 'away';

export interface VoteTally {
  home: number;
  draw: number;
  away: number;
}

export interface Reactions {
  [emoji: string]: string[];
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  fanTeamId: string;
  tab: TabId;
  text: string;
  timestamp: string;
  reactions: Reactions;
}

export interface User {
  userId: string;
  username: string;
  fanTeamId: TeamId;
}
