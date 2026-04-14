import type { TeamId } from '@/lib/types';

export interface TeamOption {
  id: TeamId;
  name: string;
  color: string;
  logo: string;
}

export const TEAMS: TeamOption[] = [
  { id: 'arsenal', name: 'Arsenal', color: '#e20520', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' },
  { id: 'aston-villa', name: 'Aston Villa', color: '#660e36', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/362.png' },
  { id: 'afc-bournemouth', name: 'Bournemouth', color: '#f42727', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/349.png' },
  { id: 'brentford', name: 'Brentford', color: '#f42727', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/337.png' },
  { id: 'brighton', name: 'Brighton', color: '#0606fa', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/331.png' },
  { id: 'burnley', name: 'Burnley', color: '#6C1D45', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/379.png' },
  { id: 'chelsea', name: 'Chelsea', color: '#144992', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png' },
  { id: 'crystal-palace', name: 'C. Palace', color: '#0202fb', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/384.png' },
  { id: 'everton', name: 'Everton', color: '#0606fa', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/368.png' },
  { id: 'fulham', name: 'Fulham', color: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/370.png' },
  { id: 'leeds-united', name: 'Leeds', color: '#1D428A', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png' },
  { id: 'liverpool', name: 'Liverpool', color: '#d11317', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' },
  { id: 'manchester-city', name: 'Man City', color: '#99c5ea', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png' },
  { id: 'manchester-united', name: 'Man United', color: '#da020e', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png' },
  { id: 'newcastle-united', name: 'Newcastle', color: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/361.png' },
  { id: 'nottingham-forest', name: "Nott'm Forest", color: '#c8102e', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/393.png' },
  { id: 'sunderland', name: 'Sunderland', color: '#EB172B', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/366.png' },
  { id: 'tottenham', name: 'Spurs', color: '#132257', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png' },
  { id: 'west-ham-united', name: 'West Ham', color: '#7c2c3b', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/371.png' },
  { id: 'wolverhampton', name: 'Wolves', color: '#fdb913', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/380.png' },
];

const TEAM_IDS = new Set<TeamId>(TEAMS.map((team) => team.id));

export function isValidTeamId(teamId: string): teamId is TeamId {
  return TEAM_IDS.has(teamId);
}
