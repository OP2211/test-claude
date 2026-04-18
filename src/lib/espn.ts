import type { Match, MatchEvent, Team } from './types';
import { horizontalRank } from './pitchPositionOrder';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

function toLocalTeamLogo(logoUrl: string | undefined, teamId: string): string {
  const fallback = `/team/${teamId}.png`;
  if (!logoUrl) return fallback;
  const match = logoUrl.match(/\/i\/teamlogos\/soccer\/500\/(\d+)\.png(?:\?.*)?$/);
  if (match?.[1]) return `/team/${match[1]}.png`;
  return fallback;
}

function toLocalTeamLogoFromUrl(logoUrl: string | undefined): string {
  if (!logoUrl) return '';
  const match = logoUrl.match(/\/i\/teamlogos\/soccer\/500\/(\d+)\.png(?:\?.*)?$/);
  if (match?.[1]) return `/team/${match[1]}.png`;
  return '';
}

export interface LeagueConfig {
  slug: string;
  name: string;
}

export const LEAGUES: LeagueConfig[] = [
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'eng.fa', name: 'FA Cup' },
  // { slug: 'uefa.champions', name: 'Champions League' },
];

/** Map ESPN team IDs to our app's team slugs for known teams. */
const ESPN_ID_TO_SLUG: Record<string, string> = {
  '360': 'manchester-united',
  '364': 'liverpool',
  '359': 'arsenal',
  '363': 'chelsea',
  '382': 'manchester-city',
  '367': 'tottenham',
  '362': 'aston-villa',
  '368': 'everton',
  '361': 'newcastle-united',
  '371': 'west-ham-united',
  '357': 'leeds-united',
  '393': 'nottingham-forest',
  '380': 'wolverhampton',
  '366': 'sunderland',
  '379': 'burnley',
  '370': 'fulham',
  '384': 'crystal-palace',
  '331': 'brighton',
  '349': 'afc-bournemouth',
  '337': 'brentford',
  '83':  'barcelona',
  '86':  'real-madrid',
  '132': 'bayern-munich',
  '111': 'juventus',
};

/** Reverse lookup: team slug → ESPN ID */
const SLUG_TO_ESPN_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ESPN_ID_TO_SLUG).map(([espnId, slug]) => [slug, espnId])
);

export function getEspnTeamId(slug: string): string | null {
  return SLUG_TO_ESPN_ID[slug] ?? null;
}

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
    logo: toLocalTeamLogo(t.logo, t.id),
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
    id: `fanground-${event.id}`,
    homeTeamId: toTeamId(home.team),
    awayTeamId: toTeamId(away.team),
    kickoff: event.date,
    competition: leagueName,
    venue: comp.venue?.displayName || '',
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
/** Format date as YYYYMMDD for ESPN API. */
function espnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Fetch matches for a league within a date range. */
async function fetchLeagueMatches(league: LeagueConfig, dateRange?: string): Promise<Match[]> {
  const params = dateRange ? `?dates=${dateRange}` : '';
  const url = `${ESPN_BASE}/${league.slug}/scoreboard${params}`;
  const res = await fetch(url, { next: { revalidate: 10 } });
  if (!res.ok) return [];
  const data: EspnScoreboard = await res.json();
  return (data.events || [])
    .map(e => mapEvent(e, league.name, league.slug))
    .filter((m): m is Match => m !== null);
}

/** Fetch matches across all configured leagues for today + upcoming 7 days. */
export async function fetchAllMatches(): Promise<Match[]> {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 3600_000);
  const dateRange = `${espnDate(now)}-${espnDate(end)}`;

  const results = await Promise.allSettled(
    LEAGUES.map(l => fetchLeagueMatches(l, dateRange))
  );

  const matches: Match[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      matches.push(...result.value);
    }
  }

  // Filter out matches that finished more than 3 hours ago (no longer joinable)
  const cutoff = now.getTime() - 3 * 3600_000;
  const filtered = matches.filter(m => {
    if (m.status === 'finished') {
      return new Date(m.kickoff).getTime() > cutoff;
    }
    return true;
  });

  // Sort: live first, then upcoming by kickoff, then recently finished last
  filtered.sort((a, b) => {
    const order = (s: Match['status']) => s === 'live' ? 0 : s === 'upcoming' ? 1 : 2;
    const oa = order(a.status);
    const ob = order(b.status);
    if (oa !== ob) return oa - ob;
    return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
  });

  return filtered;
}

/** Fetch past week's results (finished matches only). */
export async function fetchRecentResults(): Promise<Match[]> {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 3600_000);
  const yesterday = new Date(now.getTime() - 24 * 3600_000);
  const dateRange = `${espnDate(start)}-${espnDate(yesterday)}`;

  const results = await Promise.allSettled(
    LEAGUES.map(l => fetchLeagueMatches(l, dateRange))
  );

  const matches: Match[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      matches.push(...result.value);
    }
  }

  // Only keep finished matches, sorted most recent first
  return matches
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
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
          id: `fanground-${espnEventId}`,
          homeTeamId: toTeamId(home.team),
          awayTeamId: toTeamId(away.team),
          kickoff: comp.date || comp.startDate || new Date().toISOString(),
          competition: league.name,
          venue: data.gameInfo?.venue?.displayName || '',
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
  positions: string[];
  /** Shirt numbers aligned with players[] (empty string if API omits). */
  numbers: string[];
  subs: string[];
  confirmed: boolean;
}

/**
 * Extract a display surname from a full name. Handles edge cases:
 * - Single-name players like "Casemiro", "Amad", "Vinicius Jr" → returns full name
 * - Trailing whitespace from ESPN data
 * - Multi-part surnames like "Mac Allister", "Van Dijk" → keeps the surname only
 */
/** Map ESPN's verbose position abbreviation to a clean short label. */
function displayPos(abbr: string): string {
  const p = abbr.toUpperCase();
  if (p === 'G') return 'GK';
  if (p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB' || p === 'SW') return p;
  if (p.startsWith('CD')) return p.includes('L') ? 'LCB' : p.includes('R') ? 'RCB' : 'CB';
  if (p === 'CB') return 'CB';
  if (p === 'CDM' || p === 'DM') return 'CDM';
  if (p === 'CM') return 'CM';
  if (p.startsWith('CM')) return p.includes('L') ? 'LCM' : p.includes('R') ? 'RCM' : 'CM';
  if (p === 'LM') return 'LM';
  if (p === 'RM') return 'RM';
  if (p === 'AM') return 'AM';
  if (p.startsWith('AM')) return p.includes('L') ? 'LAM' : p.includes('R') ? 'RAM' : 'AM';
  if (p === 'CAM') return 'CAM';
  if (p === 'LW') return 'LW';
  if (p === 'RW') return 'RW';
  if (p === 'LF') return 'LF';
  if (p === 'RF') return 'RF';
  if (p.startsWith('CF')) return p.includes('L') ? 'LCF' : p.includes('R') ? 'RCF' : 'CF';
  if (p === 'F' || p === 'FW' || p === 'ST') return 'ST';
  if (p === 'SS') return 'SS';
  return abbr;
}

function surnameOf(displayName: string): string {
  const cleaned = displayName.trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0];
  // Use the last word as the surname (works for most cases)
  return parts[parts.length - 1];
}

/** Jersey / shirt number from a summary roster row (ESPN uses athlete.jersey for soccer). */
function shirtNumberFromRosterEntry(p: {
  athlete?: { jersey?: string | number; uniform?: { number?: string | number } };
  jersey?: string | number;
}): string {
  const raw =
    p.athlete?.jersey ?? p.athlete?.uniform?.number ?? (p as { jersey?: string | number }).jersey;
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  return s === '' ? '' : s;
}

/**
 * Categorize an ESPN position abbreviation into a row group.
 * Lower number = closer to own goal (GK=0, DEF=1, MID=2-3, FWD=4).
 */
function positionGroup(posAbbr: string): number {
  const p = posAbbr.toUpperCase();
  if (p === 'G') return 0;
  // Defenders
  if (/^(LB|RB|CB|CD|SW|LWB|RWB|WB)/.test(p)) return 1;
  // Defensive / central midfielders (catches CM, CM-L, CM-R, CDM, LM, RM, etc.)
  if (/^(CDM|DM|LDM|RDM|CM|LM|RM)/.test(p)) return 2;
  // Attacking midfielders / wingers
  if (/^(AM|CAM|LW|RW)/.test(p)) return 3;
  // Forwards
  if (/^(F|FW|ST|CF|SS|LF|RF)/.test(p)) return 4;
  return 2; // default to midfield
}

/**
 * Parse lineups from an ESPN summary JSON payload (same document as keyEvents).
 * Used to avoid a second HTTP request when we already fetched the summary.
 */
export function parseMatchLineupsFromSummaryData(
  data: unknown,
  matchStatus: Match['status'] = 'upcoming',
): { home: MatchLineup; away: MatchLineup } | null {
  try {
    const rosters = (data as { rosters?: unknown }).rosters;
    if (!Array.isArray(rosters) || rosters.length < 2) return null;

    function parseRoster(r: { formation?: string; roster?: Array<{
      starter: boolean;
      athlete: { displayName: string; shortName: string; jersey?: string | number; uniform?: { number?: string | number } };
      position?: { abbreviation: string };
      formationPlace?: number;
      jersey?: string | number;
    }> }): MatchLineup | null {
      const roster = r.roster || [];
      const starters = roster.filter(p => p.starter);
      if (starters.length === 0) return null;

      const formation = r.formation || '4-3-3';

      // Parse formation to figure out row sizes: [GK=1, ...formation parts]
      const parts = formation.split('-').map(Number).filter(n => n > 0);
      const rowSizes = [1, ...parts];

      // Bucket players by row group first
      const buckets: Record<number, typeof starters> = {};
      for (const p of starters) {
        const group = positionGroup(p.position?.abbreviation || 'CM');
        (buckets[group] = buckets[group] || []).push(p);
      }

      // Flatten buckets in row order (0=GK, 1=DEF, 2=DM/CM, 3=AM/W, 4=FWD),
      // sorting each bucket left-to-right within the row.
      const groupOrder = Object.keys(buckets).map(Number).sort((a, b) => a - b);
      const flat: typeof starters = [];
      for (const g of groupOrder) {
        buckets[g].sort((a, b) => {
          const ha = horizontalRank(a.position?.abbreviation || '');
          const hb = horizontalRank(b.position?.abbreviation || '');
          if (ha !== hb) return ha - hb;
          return (a.formationPlace || 0) - (b.formationPlace || 0);
        });
        flat.push(...buckets[g]);
      }

      // Now take players in row-sized chunks so the row widths match the formation.
      // If a bucket is larger/smaller than expected (e.g. ESPN mis-categorises a CDM
      // as midfield in a 4-2-3-1), the slicing still produces a sensible result.
      const ordered: typeof starters = [];
      let idx = 0;
      for (const size of rowSizes) {
        const rowPlayers = flat.slice(idx, idx + size);
        // Re-sort the actual assigned row left-to-right (safety net for
        // cases where a player straddled buckets)
        rowPlayers.sort((a, b) => {
          const ha = horizontalRank(a.position?.abbreviation || '');
          const hb = horizontalRank(b.position?.abbreviation || '');
          if (ha !== hb) return ha - hb;
          return (a.formationPlace || 0) - (b.formationPlace || 0);
        });
        ordered.push(...rowPlayers);
        idx += size;
      }

      const subs = roster.filter(p => !p.starter).map(p => surnameOf(p.athlete.displayName));

      return {
        formation,
        players: ordered.map(p => surnameOf(p.athlete.displayName)),
        positions: ordered.map(p => displayPos(p.position?.abbreviation || '')),
        numbers: ordered.map(p => shirtNumberFromRosterEntry(p)),
        subs,
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

/**
 * Fetch actual match-day lineups from the ESPN summary endpoint.
 * Returns { home, away } lineups with real starting 11 and formation.
 * Players are ordered GK → DEF → MID → FWD to match pitch layout.
 * Only available for live/completed matches (returns null for upcoming).
 */
export async function fetchMatchLineups(
  espnEventId: string,
  leagueSlug: string,
  matchStatus: Match['status'] = 'upcoming',
): Promise<{ home: MatchLineup; away: MatchLineup } | null> {
  const url = `${ESPN_BASE}/${leagueSlug}/summary?event=${espnEventId}`;
  try {
    // Tighter revalidate for live matches so subs propagate quickly
    const revalidate = matchStatus === 'live' ? 20 : matchStatus === 'finished' ? 3600 : 60;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    const data = await res.json();
    return parseMatchLineupsFromSummaryData(data, matchStatus);
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
  if (matchId.startsWith('fanground-')) return matchId.slice('fanground-'.length);
  // Backward compatibility for older match URLs/room IDs.
  if (matchId.startsWith('espn-')) return matchId.slice('espn-'.length);
  return null;
}

// ---------- Standings ----------

export interface StandingEntry {
  position: number;
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamAbbr: string;
  logo: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string;
  note?: { description: string; color: string };
  nextMatch?: {
    opponent: string;
    opponentLogo: string;
    date: string;
    venue: string;
    isHome: boolean;
  };
}

function statVal(stats: Array<{ name: string; value: number; displayValue: string }>, name: string): number {
  return stats.find(s => s.name === name)?.value ?? 0;
}

export async function fetchStandings(leagueSlug: string = 'eng.1'): Promise<StandingEntry[]> {
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueSlug}/standings`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data.children?.[0]?.standings?.entries;
    if (!Array.isArray(entries)) return [];

    return entries.map((e: {
      team: { id: string; displayName: string; shortDisplayName: string; abbreviation: string; logos?: Array<{ href: string }> };
      stats: Array<{ name: string; value: number; displayValue: string }>;
      note?: { description: string; color: string };
    }) => ({
      position: statVal(e.stats, 'rank'),
      teamId: e.team.id,
      teamName: e.team.displayName,
      teamShortName: e.team.shortDisplayName,
      teamAbbr: e.team.abbreviation,
      logo: toLocalTeamLogo(e.team.logos?.[0]?.href, e.team.id),
      played: statVal(e.stats, 'gamesPlayed'),
      wins: statVal(e.stats, 'wins'),
      draws: statVal(e.stats, 'ties'),
      losses: statVal(e.stats, 'losses'),
      goalsFor: statVal(e.stats, 'pointsFor'),
      goalsAgainst: statVal(e.stats, 'pointsAgainst'),
      goalDifference: statVal(e.stats, 'pointDifferential'),
      points: statVal(e.stats, 'points'),
      form: e.stats.find(s => s.name === 'overall')?.displayValue || '',
      note: e.note ? { description: e.note.description, color: e.note.color } : undefined,
    })).sort((a: StandingEntry, b: StandingEntry) => a.position - b.position);
  } catch {
    return [];
  }
}

// ---------- Top Scorers ----------

export interface TopScorer {
  rank: number;
  playerName: string;
  playerId: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  goals: number;
  assists: number;
  appearances: number;
}

export async function fetchTopScorers(leagueSlug: string = 'eng.1'): Promise<TopScorer[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/statistics`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const leaders = data.stats?.[0]?.leaders;
    if (!Array.isArray(leaders)) return [];

    return leaders.slice(0, 10).map((l: {
      value: number;
      athlete: {
        id: string;
        displayName: string;
        team: { displayName: string; abbreviation: string; logos?: Array<{ href: string }> };
        statistics?: Array<{ name: string; value: number }>;
      };
    }, i: number) => {
      const stats = l.athlete.statistics || [];
      return {
        rank: i + 1,
        playerName: l.athlete.displayName,
        playerId: l.athlete.id,
        teamName: l.athlete.team.displayName,
        teamAbbr: l.athlete.team.abbreviation,
        teamLogo: toLocalTeamLogoFromUrl(l.athlete.team.logos?.[0]?.href),
        goals: l.value,
        assists: stats.find(s => s.name === 'goalAssists')?.value ?? 0,
        appearances: stats.find(s => s.name === 'appearances')?.value ?? 0,
      };
    });
  } catch {
    return [];
  }
}

/** Fetch top players sorted by assists (uses assistsLeaders from statistics endpoint). */
export async function fetchTopAssists(leagueSlug: string = 'eng.1'): Promise<TopScorer[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/statistics`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    // Find the assistsLeaders category (index 1 typically)
    const assistsCat = (data.stats || []).find((s: { name: string }) => s.name === 'assistsLeaders');
    const leaders = assistsCat?.leaders;
    if (!Array.isArray(leaders)) return [];

    return leaders.slice(0, 10).map((l: {
      value: number;
      athlete: {
        id: string;
        displayName: string;
        team: { displayName: string; abbreviation: string; logos?: Array<{ href: string }> };
        statistics?: Array<{ name: string; value: number }>;
      };
    }, i: number) => {
      const stats = l.athlete.statistics || [];
      return {
        rank: i + 1,
        playerName: l.athlete.displayName,
        playerId: l.athlete.id,
        teamName: l.athlete.team.displayName,
        teamAbbr: l.athlete.team.abbreviation,
        teamLogo: toLocalTeamLogoFromUrl(l.athlete.team.logos?.[0]?.href),
        goals: stats.find(s => s.name === 'totalGoals')?.value ?? 0,
        assists: l.value,
        appearances: stats.find(s => s.name === 'appearances')?.value ?? 0,
      };
    });
  } catch {
    return [];
  }
}

/** Top contributor = goals + assists combined, merged from both stat categories. */
export interface TopContributor {
  rank: number;
  playerName: string;
  playerId: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  goals: number;
  assists: number;
  contributions: number;
  appearances: number;
}

export async function fetchTopContributors(leagueSlug: string = 'eng.1'): Promise<TopContributor[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/statistics`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();

    // Merge players from all stat categories (goals + assists)
    const players = new Map<string, TopContributor>();
    for (const cat of data.stats || []) {
      for (const l of (cat.leaders || []) as Array<{
        value: number;
        athlete: {
          id: string;
          displayName: string;
          team: { displayName: string; abbreviation: string; logos?: Array<{ href: string }> };
          statistics?: Array<{ name: string; value: number }>;
        };
      }>) {
        const id = l.athlete.id;
        const stats = l.athlete.statistics || [];
        const goals = stats.find(s => s.name === 'totalGoals')?.value ?? 0;
        const assists = stats.find(s => s.name === 'goalAssists')?.value ?? 0;
        const appearances = stats.find(s => s.name === 'appearances')?.value ?? 0;

        if (!players.has(id)) {
          players.set(id, {
            rank: 0,
            playerName: l.athlete.displayName,
            playerId: id,
            teamName: l.athlete.team.displayName,
            teamAbbr: l.athlete.team.abbreviation,
            teamLogo: toLocalTeamLogoFromUrl(l.athlete.team.logos?.[0]?.href),
            goals,
            assists,
            contributions: goals + assists,
            appearances,
          });
        } else {
          // Take higher values (same player may appear in both categories)
          const p = players.get(id)!;
          p.goals = Math.max(p.goals, goals);
          p.assists = Math.max(p.assists, assists);
          p.appearances = Math.max(p.appearances, appearances);
          p.contributions = p.goals + p.assists;
        }
      }
    }

    const sorted = [...players.values()].sort((a, b) => b.contributions - a.contributions || b.goals - a.goals);
    return sorted.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));
  } catch {
    return [];
  }
}

// ---------- Match events (goals, cards) ----------

/** Parse keyEvents from an ESPN summary JSON payload. */
export function parseMatchEventsFromSummaryData(data: unknown, homeTeamName: string): MatchEvent[] {
  try {
    const keyEvents = (data as { keyEvents?: unknown }).keyEvents;
    if (!Array.isArray(keyEvents)) return [];

    const events: MatchEvent[] = [];
    for (const e of keyEvents) {
      const typeText = (e.type?.text || '').toLowerCase();
      let type: MatchEvent['type'];
      if (typeText.includes('goal')) type = 'goal';
      else if (typeText.includes('red')) type = 'red-card';
      else if (typeText.includes('yellow')) type = 'yellow-card';
      else if (typeText.includes('sub')) type = 'substitution';
      else continue; // skip kickoff, halftime, etc.

      const teamName = e.team?.displayName || '';
      const teamId: MatchEvent['teamId'] = teamName === homeTeamName ? 'home' : 'away';
      const players = e.participants || [];
      const scorer = players[0]?.athlete?.displayName || '';
      const assister = players[1]?.athlete?.displayName || '';

      events.push({
        type,
        clock: e.clock?.displayValue || '',
        teamId,
        player: surnameOf(scorer),
        assist: assister ? surnameOf(assister) : undefined,
        detail: type === 'goal' ? (e.text || undefined) : undefined,
      });
    }
    return events;
  } catch {
    return [];
  }
}

/**
 * Single ESPN summary fetch (events + lineups share this document).
 * Revalidate policy aligned with fetchMatchLineups for cache coherence.
 */
export async function fetchEspnMatchSummaryData(
  espnEventId: string,
  leagueSlug: string,
  matchStatus: Match['status'],
): Promise<unknown | null> {
  const url = `${ESPN_BASE}/${leagueSlug}/summary?event=${espnEventId}`;
  try {
    const revalidate = matchStatus === 'live' ? 20 : matchStatus === 'finished' ? 3600 : 60;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchMatchEvents(
  espnEventId: string,
  leagueSlug: string,
  homeTeamName: string
): Promise<MatchEvent[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/summary?event=${espnEventId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) return [];
    const data = await res.json();
    return parseMatchEventsFromSummaryData(data, homeTeamName);
  } catch {
    return [];
  }
}

// ---------- Next match per team ----------

export async function fetchTeamNextMatch(espnTeamId: string, leagueSlug: string = 'eng.1'): Promise<StandingEntry['nextMatch'] | null> {
  const url = `${ESPN_BASE}/${leagueSlug}/teams/${espnTeamId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const evt = data.team?.nextEvent?.[0] || data.nextEvent?.[0];
    if (!evt) return null;
    const comp = evt.competitions?.[0];
    if (!comp) return null;
    const competitors = comp.competitors || [];
    const us = competitors.find((c: { id: string }) => c.id === espnTeamId);
    const them = competitors.find((c: { id: string }) => c.id !== espnTeamId);
    if (!them) return null;
    return {
      opponent: them.team?.displayName || them.team?.shortDisplayName || '?',
      opponentLogo: toLocalTeamLogo(them.team?.logos?.[0]?.href, them.id),
      date: evt.date || comp.date || '',
      venue: comp.venue?.fullName || '',
      isHome: us?.homeAway === 'home',
    };
  } catch {
    return null;
  }
}

/** Fetch standings with next-match info for each team (batched). */
export async function fetchStandingsWithNextMatch(leagueSlug: string = 'eng.1'): Promise<StandingEntry[]> {
  const standings = await fetchStandings(leagueSlug);
  if (standings.length === 0) return standings;

  // Fetch next matches in parallel for all teams
  const nextMatches = await Promise.allSettled(
    standings.map(s => fetchTeamNextMatch(s.teamId, leagueSlug))
  );

  for (let i = 0; i < standings.length; i++) {
    const result = nextMatches[i];
    if (result.status === 'fulfilled' && result.value) {
      standings[i].nextMatch = result.value;
    }
  }

  return standings;
}

// ---------- Remaining season fixtures for a team ----------

export interface TeamFixture {
  id: string;
  date: string;
  opponent: string;
  opponentLogo: string;
  competition: string;
  venue: string;
  isHome: boolean;
  status: Match['status'];
}

/** Fetch all remaining season fixtures for a team by ESPN team ID. */
export async function fetchTeamRemainingFixtures(espnTeamId: string, leagueSlug: string = 'eng.1'): Promise<TeamFixture[]> {
  const now = new Date();
  const seasonEnd = new Date(now.getFullYear(), 4, 31); // May 31
  const dateRange = `${espnDate(now)}-${espnDate(seasonEnd)}`;
  const url = `${ESPN_BASE}/${leagueSlug}/scoreboard?dates=${dateRange}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data: EspnScoreboard = await res.json();
    const fixtures: TeamFixture[] = [];
    for (const event of data.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const competitors = comp.competitors || [];
      const us = competitors.find(c => c.team.id === espnTeamId);
      if (!us) continue;
      const them = competitors.find(c => c.team.id !== espnTeamId);
      if (!them) continue;
      fixtures.push({
        id: `fanground-${event.id}`,
        date: event.date,
        opponent: them.team.displayName,
        opponentLogo: toLocalTeamLogo(them.team.logo, them.team.id),
        competition: 'Premier League',
        venue: comp.venue?.displayName || '',
        isHome: us.homeAway === 'home',
        status: mapStatus(event.status.type.state),
      });
    }
    return fixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

// ---------- Past results for a team ----------

export interface TeamResult {
  id: string;
  date: string;
  opponent: string;
  opponentLogo: string;
  competition: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
}

/** Fetch last N completed matches for a team from ESPN schedule endpoint. */
export async function fetchTeamRecentResults(espnTeamId: string, leagueSlug: string = 'eng.1', limit: number = 5): Promise<TeamResult[]> {
  const url = `${ESPN_BASE}/${leagueSlug}/teams/${espnTeamId}/schedule`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = (data.events || []) as Array<{
      id: string;
      date: string;
      competitions: Array<{
        competitors: Array<{
          homeAway: string;
          team: EspnTeam;
          score?: { displayValue?: string; value?: number };
        }>;
        status?: { type?: { state?: string } };
      }>;
    }>;

    const finished = events
      .filter(e => e.competitions?.[0]?.status?.type?.state === 'post')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return finished.map(e => {
      const comp = e.competitions[0];
      const us = comp.competitors.find(c => c.team.id === espnTeamId);
      const them = comp.competitors.find(c => c.team.id !== espnTeamId);
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      return {
        id: `fanground-${e.id}`,
        date: e.date,
        opponent: them?.team.displayName || '?',
        opponentLogo: toLocalTeamLogo(them?.team.logo, them?.team.id || '0'),
        competition: 'Premier League',
        isHome: us?.homeAway === 'home',
        homeScore: parseInt(home?.score?.displayValue || '0', 10),
        awayScore: parseInt(away?.score?.displayValue || '0', 10),
      };
    });
  } catch {
    return [];
  }
}
