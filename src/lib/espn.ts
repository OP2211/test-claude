import type { Match, Team } from './types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export interface LeagueConfig {
  slug: string;
  name: string;
}

export const LEAGUES: LeagueConfig[] = [
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'esp.1', name: 'La Liga' },
  { slug: 'ger.1', name: 'Bundesliga' },
  { slug: 'ita.1', name: 'Serie A' },
  { slug: 'uefa.champions', name: 'Champions League' },
];

/** Map ESPN team IDs to our app's team slugs for known teams. */
const ESPN_ID_TO_SLUG: Record<string, string> = {
  '360': 'manchester-united',
  '364': 'liverpool',
  '359': 'arsenal',
  '363': 'chelsea',
  '382': 'manchester-city',
  '367': 'tottenham',
  '83':  'barcelona',
  '86':  'real-madrid',
  '132': 'bayern-munich',
  '111': 'juventus',
};

/** Default badge emojis for teams we don't have a mapping for. */
function teamBadge(color: string): string {
  const c = color.toLowerCase();
  if (c.startsWith('ff') || c.startsWith('e2') || c.startsWith('d1') || c.startsWith('da') || c.startsWith('f4') || c.startsWith('dc')) return '\u{1F534}';
  if (c.startsWith('00') || c.startsWith('03') || c.startsWith('06')) return '\u{1F535}';
  return '\u26BD';
}

// ---------- ESPN response types ----------

interface EspnTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  color: string;
  alternateColor?: string;
  logo: string;
}

interface EspnCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  score: string;
  team: EspnTeam;
  form?: string;
}

interface EspnStatusType {
  state: 'pre' | 'in' | 'post';
  completed: boolean;
  detail: string;
  shortDetail: string;
}

interface EspnVenue {
  displayName: string;
  fullName?: string;
}

interface EspnEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    displayClock: string;
    type: EspnStatusType;
  };
  competitions: Array<{
    competitors: EspnCompetitor[];
    venue?: EspnVenue;
  }>;
}

interface EspnScoreboard {
  events: EspnEvent[];
}

interface EspnRosterEntry {
  id: string;
  displayName: string;
  shortName: string;
  jersey?: string;
  position?: {
    name: string;
    abbreviation: string;
  };
}

interface EspnRosterResponse {
  athletes: EspnRosterEntry[];
}

// ---------- Mapping helpers ----------

function mapStatus(state: string): Match['status'] {
  if (state === 'in') return 'live';
  if (state === 'post') return 'finished';
  return 'upcoming';
}

function espnTeamToTeam(t: EspnTeam): Team {
  return {
    name: t.displayName,
    shortName: t.shortDisplayName || t.abbreviation,
    badge: teamBadge(t.color),
    color: `#${t.color}`,
    logo: t.logo,
  };
}

function toTeamId(espnTeam: EspnTeam): string {
  return ESPN_ID_TO_SLUG[espnTeam.id] || espnTeam.displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function mapEvent(event: EspnEvent, leagueName: string, leagueSlug: string): Match | null {
  const comp = event.competitions?.[0];
  if (!comp || !comp.competitors || comp.competitors.length < 2) return null;

  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = mapStatus(event.status.type.state);
  const homeScore = parseInt(home.score, 10);
  const awayScore = parseInt(away.score, 10);

  return {
    id: `espn-${event.id}`,
    homeTeamId: toTeamId(home.team),
    awayTeamId: toTeamId(away.team),
    kickoff: event.date,
    competition: leagueName,
    venue: comp.venue?.displayName || 'TBD',
    status,
    homeTeam: espnTeamToTeam(home.team),
    awayTeam: espnTeamToTeam(away.team),
    homeScore: status !== 'upcoming' ? homeScore : undefined,
    awayScore: status !== 'upcoming' ? awayScore : undefined,
    clock: status === 'live' ? event.status.type.shortDetail : undefined,
    teamSheet: {
      home: { formation: '4-3-3', players: [], confirmed: false },
      away: { formation: '4-3-3', players: [], confirmed: false },
    },
    _espn: {
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      leagueSlug,
    },
  };
}

// ---------- Public API ----------

/** Fetch today's matches from a single league. */
async function fetchLeagueMatches(league: LeagueConfig): Promise<Match[]> {
  const url = `${ESPN_BASE}/${league.slug}/scoreboard`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data: EspnScoreboard = await res.json();
  return (data.events || [])
    .map(e => mapEvent(e, league.name, league.slug))
    .filter((m): m is Match => m !== null);
}

/** Fetch today's matches across all configured leagues. */
export async function fetchAllMatches(): Promise<Match[]> {
  const results = await Promise.allSettled(
    LEAGUES.map(l => fetchLeagueMatches(l))
  );

  const matches: Match[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      matches.push(...result.value);
    }
  }

  // Sort: live first, then by kickoff time ascending
  matches.sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
  });

  return matches;
}

/** Fetch a single match by ESPN event ID. */
export async function fetchMatch(espnEventId: string): Promise<Match | null> {
  // Try each league until we find the match
  for (const league of LEAGUES) {
    const url = `${ESPN_BASE}/${league.slug}/summary?event=${espnEventId}`;
    try {
      const res = await fetch(url, { next: { revalidate: 30 } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.header?.competitions?.[0]) {
        const comp = data.header.competitions[0];
        const competitors = comp.competitors || [];
        const home = competitors.find((c: EspnCompetitor) => c.homeAway === 'home');
        const away = competitors.find((c: EspnCompetitor) => c.homeAway === 'away');
        if (!home || !away) continue;

        const status = mapStatus(comp.status?.type?.state || 'pre');
        const homeScore = parseInt(home.score || '0', 10);
        const awayScore = parseInt(away.score || '0', 10);

        return {
          id: `espn-${espnEventId}`,
          homeTeamId: toTeamId(home.team),
          awayTeamId: toTeamId(away.team),
          kickoff: comp.date || comp.startDate || new Date().toISOString(),
          competition: league.name,
          venue: data.gameInfo?.venue?.displayName || 'TBD',
          status,
          homeTeam: espnTeamToTeam(home.team),
          awayTeam: espnTeamToTeam(away.team),
          homeScore: status !== 'upcoming' ? homeScore : undefined,
          awayScore: status !== 'upcoming' ? awayScore : undefined,
          clock: status === 'live' ? (comp.status?.type?.shortDetail || '') : undefined,
          teamSheet: {
            home: { formation: '4-3-3', players: [], confirmed: false },
            away: { formation: '4-3-3', players: [], confirmed: false },
          },
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Lineup data returned from the summary endpoint. */
export interface MatchLineup {
  formation: string;
  players: string[];
  confirmed: boolean;
}

/**
 * Extract a display surname from a full name. Handles edge cases:
 * - Single-name players like "Casemiro", "Amad", "Vinicius Jr" → returns full name
 * - Trailing whitespace from ESPN data
 * - Multi-part surnames like "Mac Allister", "Van Dijk" → keeps the surname only
 */
function surnameOf(displayName: string): string {
  const cleaned = displayName.trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0];
  // Use the last word as the surname (works for most cases)
  return parts[parts.length - 1];
}

/**
 * Categorize an ESPN position abbreviation into a row group.
 * Lower number = closer to own goal (GK=0, DEF=1, MID=2-3, FWD=4).
 */
function positionGroup(posAbbr: string): number {
  if (posAbbr === 'G') return 0;
  // Defenders
  if (/^(LB|RB|CB|CD|CD-L|CD-R|SW|LWB|RWB|WB)/.test(posAbbr)) return 1;
  // Defensive / central midfielders
  if (/^(CDM|DM|LDM|RDM|CM|LM|RM)$/.test(posAbbr)) return 2;
  // Attacking midfielders / wingers
  if (/^(AM|AM-L|AM-R|CAM|LW|RW)/.test(posAbbr)) return 3;
  // Forwards
  if (/^(F|FW|ST|CF|SS|LF|RF)/.test(posAbbr)) return 4;
  return 2; // default to midfield
}

/**
 * Fetch actual match-day lineups from the ESPN summary endpoint.
 * Returns { home, away } lineups with real starting 11 and formation.
 * Players are ordered GK → DEF → MID → FWD to match pitch layout.
 * Only available for live/completed matches (returns null for upcoming).
 */
export async function fetchMatchLineups(
  espnEventId: string,
  leagueSlug: string,
  matchStatus: Match['status'] = 'upcoming'
): Promise<{ home: MatchLineup; away: MatchLineup } | null> {
  const url = `${ESPN_BASE}/${leagueSlug}/summary?event=${espnEventId}`;
  try {
    // Tighter revalidate for live matches so subs propagate quickly
    const revalidate = matchStatus === 'live' ? 20 : matchStatus === 'finished' ? 3600 : 60;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    const data = await res.json();
    const rosters = data.rosters;
    if (!Array.isArray(rosters) || rosters.length < 2) return null;

    function parseRoster(r: { formation?: string; roster?: Array<{
      starter: boolean;
      athlete: { displayName: string; shortName: string };
      position?: { abbreviation: string };
      formationPlace?: number;
    }> }): MatchLineup | null {
      const roster = r.roster || [];
      const starters = roster.filter(p => p.starter);
      if (starters.length === 0) return null;

      const formation = r.formation || '4-3-3';

      // Parse formation to figure out how many rows and slots per row
      const parts = formation.split('-').map(Number).filter(n => n > 0);
      // Row sizes: [1 (GK), ...formation parts]
      const rowSizes = [1, ...parts];

      // Sort starters by position group, then by formationPlace within group
      starters.sort((a, b) => {
        const ga = positionGroup(a.position?.abbreviation || 'CM');
        const gb = positionGroup(b.position?.abbreviation || 'CM');
        if (ga !== gb) return ga - gb;
        return (a.formationPlace || 0) - (b.formationPlace || 0);
      });

      // Assign players to formation rows by taking rowSizes[i] players per row
      const ordered: typeof starters = [];
      let idx = 0;
      for (const size of rowSizes) {
        // Take the next `size` players from the sorted list
        const rowPlayers = starters.slice(idx, idx + size);
        ordered.push(...rowPlayers);
        idx += size;
      }

      return {
        formation,
        players: ordered.map(p => surnameOf(p.athlete.displayName)),
        // Confirmed only once teams are out (live/finished). Pre-match data is
        // ESPN's predicted/announced XI which may change.
        confirmed: matchStatus !== 'upcoming',
      };
    }

    const home = parseRoster(rosters[0]);
    const away = parseRoster(rosters[1]);
    if (!home || !away) return null;
    return { home, away };
  } catch {
    return null;
  }
}

/** Fetch a team's full squad roster from ESPN (fallback for upcoming matches). Returns player surnames. */
export async function fetchTeamRoster(espnTeamId: string, leagueSlug: string): Promise<string[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/teams/${espnTeamId}/roster`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data: EspnRosterResponse = await res.json();
    const players = (data.athletes || []).filter(p => p.displayName && p.position);
    // Sort: GK first, then D, M, F — pick first 11
    const posOrder: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };
    players.sort((a, b) => {
      const pa = posOrder[a.position?.abbreviation || 'M'] ?? 2;
      const pb = posOrder[b.position?.abbreviation || 'M'] ?? 2;
      return pa - pb;
    });
    return players.slice(0, 11).map(p => surnameOf(p.displayName));
  } catch {
    return [];
  }
}

/** Extract the ESPN event ID from our match ID format. */
export function extractEspnId(matchId: string): string | null {
  if (matchId.startsWith('espn-')) return matchId.slice(5);
  return null;
}
