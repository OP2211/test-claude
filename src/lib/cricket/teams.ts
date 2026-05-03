import type { TeamId } from '@/lib/types';
import type { CricketTeamInfo } from './types';

/** ESPN cricket logo CDN URL pattern. Returns a 200 PNG for known team ids. */
function espnLogoUrl(espnId: string): string {
  return `https://a.espncdn.com/i/teamlogos/cricket/500/${espnId}.png`;
}

/**
 * Static IPL franchise registry. ESPN's /teams cricket endpoint returns empty,
 * so we keep our own canonical list and match ESPN events to it by displayName.
 * espnIds, colors, and logos here were harvested from ESPN's IPL scoreboard so the
 * picker UI shows real franchise crests instead of initials. The match-detail
 * adapter will still override `logo` when ESPN ships a per-event variant.
 */
export const CRICKET_TEAMS: CricketTeamInfo[] = [
  { id: 'chennai-super-kings',         espnId: '335974',  name: 'Chennai Super Kings',         shortName: 'CSK',  color: '#F5AE0C', logo: espnLogoUrl('335974')  },
  { id: 'mumbai-indians',              espnId: '335978',  name: 'Mumbai Indians',              shortName: 'MI',   color: '#004B8D', logo: espnLogoUrl('335978')  },
  { id: 'royal-challengers-bengaluru', espnId: '335970',  name: 'Royal Challengers Bengaluru', shortName: 'RCB',  color: '#F10920', logo: espnLogoUrl('335970')  },
  { id: 'kolkata-knight-riders',       espnId: '335971',  name: 'Kolkata Knight Riders',       shortName: 'KKR',  color: '#573F82', logo: espnLogoUrl('335971')  },
  { id: 'sunrisers-hyderabad',         espnId: '628333',  name: 'Sunrisers Hyderabad',         shortName: 'SRH',  color: '#EE7429', logo: espnLogoUrl('628333')  },
  { id: 'delhi-capitals',              espnId: '335975',  name: 'Delhi Capitals',              shortName: 'DC',   color: '#2561AE', logo: espnLogoUrl('335975')  },
  { id: 'punjab-kings',                espnId: '335973',  name: 'Punjab Kings',                shortName: 'PBKS', color: '#B3181E', logo: espnLogoUrl('335973')  },
  { id: 'rajasthan-royals',            espnId: '335977',  name: 'Rajasthan Royals',            shortName: 'RR',   color: '#C511E8', logo: espnLogoUrl('335977')  },
  { id: 'gujarat-titans',              espnId: '1298769', name: 'Gujarat Titans',              shortName: 'GT',   color: '#334779', logo: espnLogoUrl('1298769') },
  { id: 'lucknow-super-giants',        espnId: '1298768', name: 'Lucknow Super Giants',        shortName: 'LSG',  color: '#0057E2', logo: espnLogoUrl('1298768') },
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
