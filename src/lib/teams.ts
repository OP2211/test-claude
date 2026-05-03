import type { TeamId } from '@/lib/types';
import { CRICKET_TEAMS } from '@/lib/cricket/teams';

export interface TeamOption {
  id: TeamId;
  name: string;
  color: string;
  logo: string;
}

export const TEAMS: TeamOption[] = [
  { id: 'arsenal', name: 'Arsenal', color: '#e20520', logo: '/team/359.png' },
  { id: 'aston-villa', name: 'Aston Villa', color: '#660e36', logo: '/team/362.png' },
  { id: 'afc-bournemouth', name: 'Bournemouth', color: '#f42727', logo: '/team/349.png' },
  { id: 'brentford', name: 'Brentford', color: '#f42727', logo: '/team/337.png' },
  { id: 'brighton', name: 'Brighton', color: '#0606fa', logo: '/team/331.png' },
  { id: 'burnley', name: 'Burnley', color: '#6C1D45', logo: '/team/379.png' },
  { id: 'chelsea', name: 'Chelsea', color: '#144992', logo: '/team/363.png' },
  { id: 'crystal-palace', name: 'C. Palace', color: '#0202fb', logo: '/team/384.png' },
  { id: 'everton', name: 'Everton', color: '#0606fa', logo: '/team/368.png' },
  { id: 'fulham', name: 'Fulham', color: '#000000', logo: '/team/370.png' },
  { id: 'leeds-united', name: 'Leeds', color: '#1D428A', logo: '/team/357.png' },
  { id: 'liverpool', name: 'Liverpool', color: '#d11317', logo: '/team/364.png' },
  { id: 'manchester-city', name: 'Man City', color: '#99c5ea', logo: '/team/382.png' },
  { id: 'manchester-united', name: 'Man United', color: '#da020e', logo: '/team/360.png' },
  { id: 'newcastle-united', name: 'Newcastle', color: '#000000', logo: '/team/361.png' },
  { id: 'nottingham-forest', name: "Nott'm Forest", color: '#c8102e', logo: '/team/393.png' },
  { id: 'sunderland', name: 'Sunderland', color: '#EB172B', logo: '/team/366.png' },
  { id: 'tottenham', name: 'Spurs', color: '#132257', logo: '/team/367.png' },
  { id: 'west-ham-united', name: 'West Ham', color: '#7c2c3b', logo: '/team/371.png' },
  { id: 'wolverhampton', name: 'Wolves', color: '#fdb913', logo: '/team/380.png' },
];

/** Combined registry used for sport-agnostic lookups (chat badges, fan team validation). */
const CRICKET_OPTIONS: TeamOption[] = CRICKET_TEAMS.map((t) => ({
  id: t.id,
  name: t.shortName,
  color: t.color,
  logo: t.logo ?? '',
}));

export const ALL_TEAMS: TeamOption[] = [...TEAMS, ...CRICKET_OPTIONS];

const TEAM_IDS = new Set<TeamId>(ALL_TEAMS.map((team) => team.id));
const FOOTBALL_TEAM_IDS = new Set<TeamId>(TEAMS.map((team) => team.id));
const CRICKET_TEAM_IDS = new Set<TeamId>(CRICKET_OPTIONS.map((team) => team.id));

export function isValidTeamId(teamId: string): teamId is TeamId {
  return TEAM_IDS.has(teamId);
}

/** Validates the input is a known FOOTBALL team slug. Used for the football onboarding flow. */
export function isFootballTeamId(teamId: string): teamId is TeamId {
  return FOOTBALL_TEAM_IDS.has(teamId);
}

/** Validates the input is a known CRICKET (IPL) team slug. Used for the cricket fan-team flow. */
export function isCricketTeamId(teamId: string): teamId is TeamId {
  return CRICKET_TEAM_IDS.has(teamId);
}

export type Sport = 'football' | 'cricket';

export function teamSportFor(teamId: string | null | undefined): Sport | null {
  if (!teamId) return null;
  if (FOOTBALL_TEAM_IDS.has(teamId)) return 'football';
  if (CRICKET_TEAM_IDS.has(teamId)) return 'cricket';
  return null;
}

/** Sport-agnostic lookup. Use this in chat/profile code instead of `TEAMS.find(...)`. */
export function getTeamInfo(teamId: string | null | undefined): TeamOption | null {
  if (!teamId) return null;
  return ALL_TEAMS.find((t) => t.id === teamId) ?? null;
}

/** Returns the user's fan team id for a given sport, or null when not set. */
export function getFanTeamForSport(
  user: { fanTeamId?: TeamId | null; cricketFanTeamId?: TeamId | null },
  sport: Sport,
): TeamId | null {
  if (sport === 'cricket') return user.cricketFanTeamId ?? null;
  return user.fanTeamId ?? null;
}
