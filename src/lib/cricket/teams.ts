import type { TeamId } from '@/lib/types';
import type { CricketTeamInfo } from './types';

/**
 * Static IPL franchise registry. ESPN's /teams cricket endpoint returns empty,
 * so we keep our own canonical list and match ESPN events to it by displayName
 * (and espnId when stable). `espnId` is best-effort; a name fallback is used
 * when ESPN returns a previously-unseen id.
 */
export const CRICKET_TEAMS: CricketTeamInfo[] = [
  { id: 'chennai-super-kings',         espnId: '4343',    name: 'Chennai Super Kings',         shortName: 'CSK',  color: '#F9CD05' },
  { id: 'mumbai-indians',              espnId: '335978',  name: 'Mumbai Indians',              shortName: 'MI',   color: '#004B8D' },
  { id: 'royal-challengers-bengaluru', espnId: '4341',    name: 'Royal Challengers Bengaluru', shortName: 'RCB',  color: '#DA1818' },
  { id: 'kolkata-knight-riders',       espnId: '4335',    name: 'Kolkata Knight Riders',       shortName: 'KKR',  color: '#3A225D' },
  { id: 'sunrisers-hyderabad',         espnId: '4342',    name: 'Sunrisers Hyderabad',         shortName: 'SRH',  color: '#F26522' },
  { id: 'delhi-capitals',              espnId: '4344',    name: 'Delhi Capitals',              shortName: 'DC',   color: '#17479E' },
  { id: 'punjab-kings',                espnId: '4336',    name: 'Punjab Kings',                shortName: 'PBKS', color: '#AA0800' },
  { id: 'rajasthan-royals',            espnId: '4337',    name: 'Rajasthan Royals',            shortName: 'RR',   color: '#EA1A85' },
  { id: 'gujarat-titans',              espnId: '1298769', name: 'Gujarat Titans',              shortName: 'GT',   color: '#1B2133' },
  { id: 'lucknow-super-giants',        espnId: '1298770', name: 'Lucknow Super Giants',        shortName: 'LSG',  color: '#0F5296' },
];

const BY_ID = new Map<TeamId, CricketTeamInfo>(CRICKET_TEAMS.map((t) => [t.id, t]));
const BY_ESPN_ID = new Map<string, CricketTeamInfo>(CRICKET_TEAMS.map((t) => [t.espnId, t]));
const BY_NAME = new Map<string, CricketTeamInfo>(
  CRICKET_TEAMS.map((t) => [t.name.toLowerCase(), t])
);

export function isCricketTeamId(id: string): boolean {
  return BY_ID.has(id);
}

export function getCricketTeamById(id: TeamId | string): CricketTeamInfo | undefined {
  return BY_ID.get(id);
}

export function getCricketTeamByEspnId(espnId: string): CricketTeamInfo | undefined {
  return BY_ESPN_ID.get(espnId);
}

export function getCricketTeamByName(name: string): CricketTeamInfo | undefined {
  return BY_NAME.get(name.toLowerCase());
}

/**
 * Resolve an ESPN competitor to our canonical franchise, trying id then name.
 * Returns a synthesized placeholder if ESPN surfaces a team we don't know
 * (e.g. pre-season, new franchise) so the UI can still render.
 */
export function resolveCricketTeam(
  espnId: string,
  displayName: string
): CricketTeamInfo {
  const byId = BY_ESPN_ID.get(espnId);
  if (byId) return byId;
  const byName = BY_NAME.get(displayName.toLowerCase());
  if (byName) return byName;
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    id: slug || `espn-${espnId}`,
    espnId,
    name: displayName,
    shortName: displayName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase(),
    color: '#334779',
  };
}
