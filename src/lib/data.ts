import type { Team, Match } from './types';
import {
  fetchAllMatches,
  fetchEspnMatchSummaryData,
  fetchMatchLineups,
  fetchMatchEvents,
  fetchTeamRoster,
  extractEspnId,
  parseMatchEventsFromSummaryData,
  parseMatchLineupsFromSummaryData,
} from './espn';

const TEAMS: Record<string, Team> = {
  'manchester-united': { name: 'Manchester United', shortName: 'MAN UTD', badge: '\u{1F534}', color: '#DA020E', logo: '/team/360.png' },
  'liverpool':         { name: 'Liverpool',         shortName: 'LIV',     badge: '\u{1F534}', color: '#C8102E', logo: '/team/364.png' },
  'arsenal':           { name: 'Arsenal',           shortName: 'ARS',     badge: '\u{1F534}', color: '#EF0107', logo: '/team/359.png' },
  'chelsea':           { name: 'Chelsea',           shortName: 'CHE',     badge: '\u{1F535}', color: '#034694', logo: '/team/363.png' },
  'manchester-city':   { name: 'Manchester City',   shortName: 'MCI',     badge: '\u{1F535}', color: '#6CABDD', logo: '/team/382.png' },
  'tottenham':         { name: 'Tottenham',         shortName: 'TOT',     badge: '\u26AA', color: '#132257', logo: '/team/367.png' },
  'barcelona':         { name: 'Barcelona',         shortName: 'BAR',     badge: '\u{1F535}\u{1F534}', color: '#A50044', logo: '/team/83.png' },
  'real-madrid':       { name: 'Real Madrid',       shortName: 'RMA',     badge: '\u26AA', color: '#FEBE10', logo: '/team/86.png' },
  'bayern-munich':     { name: 'Bayern Munich',     shortName: 'BAY',     badge: '\u{1F534}', color: '#DC052D', logo: '/team/132.png' },
  'juventus':          { name: 'Juventus',          shortName: 'JUV',     badge: '\u26AB', color: '#000000', logo: '/team/111.png' },
};

const SQUAD_PLAYERS: Record<string, string[]> = {
  'manchester-united': ['Onana', 'Dalot', 'Maguire', 'Lindel\u00F6f', 'Shaw', 'Casemiro', 'Fernandes', 'Mount', 'Rashford', 'H\u00F8jlund', 'Antony'],
  'liverpool':         ['Alisson', 'Alexander-Arnold', 'Konat\u00E9', 'Van Dijk', 'Robertson', 'Endo', 'Szoboszlai', 'Mac Allister', 'Salah', 'N\u00FA\u00F1ez', 'D\u00EDaz'],
  'arsenal':           ['Raya', 'Ben White', 'Saliba', 'Gabriel', 'Zinchenko', 'Rice', 'Partey', '\u00D8degaard', 'Saka', 'Havertz', 'Martinelli'],
  'chelsea':           ['S\u00E1nchez', 'James', 'Chalobah', 'Colwill', 'Chilwell', 'Caicedo', 'Gallagher', 'Palmer', 'Mudryk', 'Jackson', 'Sterling'],
  'manchester-city':   ['Ederson', 'Walker', 'R\u00FAben Dias', 'Akanji', 'Gvardiol', 'Rodri', 'De Bruyne', 'Bernardo', 'Doku', 'Haaland', 'Foden'],
  'tottenham':         ['Vicario', 'Porro', 'Romero', 'Van de Ven', 'Udogie', 'Bissouma', 'Bentancur', 'Maddison', 'Kulusevski', 'Son', 'Richarlison'],
  'barcelona':         ['Ter Stegen', 'Kound\u00E9', 'Araujo', 'Christensen', 'Balde', 'Pedri', 'Gavi', 'De Jong', 'Yamal', 'Lewandowski', 'Torres'],
  'real-madrid':       ['Courtois', 'Carvajal', 'Milit\u00E3o', 'Alaba', 'Mendy', 'Valverde', 'Modri\u0107', 'Kroos', 'Bellingham', 'Vinicius Jr', 'Rodrigo'],
  'bayern-munich':     ['Neuer', 'Mazraoui', 'Upamecano', 'Kim', 'Davies', 'Kimmich', 'Goretzka', 'M\u00FCller', 'Gnabry', 'Kane', 'San\u00E9'],
  'juventus':          ['Szczesny', 'Danilo', 'Bremer', 'Gatti', 'Cambiaso', 'Fagioli', 'Locatelli', 'Rabiot', 'Chiesa', 'Vlahovi\u0107', 'Kostic'],
};

export const DEMO_MATCH_ID = 'demo-live-match';

/** Set to `true` to prepend a synthetic demo room to match lists again (e.g. when no live data). */
export const INCLUDE_DEMO_MATCH = false;

const DEMO_KICKOFF_ISO = new Date(Date.now() - 15 * 60_000).toISOString();

/** Hardcoded fallback matches used when ESPN is unavailable. */
function buildFallbackMatches(): Match[] {
  const now = new Date();
  const raw: Array<{ id: string; homeTeamId: string; awayTeamId: string; offsetHours: number; competition: string; venue: string; status: Match['status'] }> = [
    { id: 'match-1', homeTeamId: 'manchester-united', awayTeamId: 'liverpool',       offsetHours: 1.5,  competition: 'Premier League',    venue: 'Old Trafford',    status: 'upcoming' },
    { id: 'match-2', homeTeamId: 'arsenal',           awayTeamId: 'manchester-city', offsetHours: 4,    competition: 'Premier League',    venue: 'Emirates Stadium', status: 'upcoming' },
    { id: 'match-3', homeTeamId: 'barcelona',         awayTeamId: 'real-madrid',     offsetHours: 0.5,  competition: 'La Liga',           venue: 'Camp Nou',         status: 'upcoming' },
    { id: 'match-4', homeTeamId: 'chelsea',           awayTeamId: 'tottenham',       offsetHours: -1,   competition: 'Premier League',    venue: 'Stamford Bridge',  status: 'live' },
    { id: 'match-5', homeTeamId: 'bayern-munich',     awayTeamId: 'juventus',        offsetHours: 26,   competition: 'Champions League',  venue: 'Allianz Arena',    status: 'upcoming' },
  ];

  return raw.map(m => ({
    id: m.id,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    kickoff: new Date(now.getTime() + m.offsetHours * 3600000).toISOString(),
    competition: m.competition,
    venue: m.venue,
    status: m.status,
    homeTeam: TEAMS[m.homeTeamId],
    awayTeam: TEAMS[m.awayTeamId],
    teamSheet: {
      home: { formation: '4-3-3', players: SQUAD_PLAYERS[m.homeTeamId] || [], confirmed: Math.random() > 0.5 },
      away: { formation: '4-4-2', players: SQUAD_PLAYERS[m.awayTeamId] || [], confirmed: Math.random() > 0.5 },
    },
  }));
}

function buildDemoLiveMatch(sourceMatches: Match[]): Match {
  const seed = sourceMatches.find((m) => m.status === 'live') ?? sourceMatches[0] ?? buildFallbackMatches()[0];
  const demoHomeTeamId = 'manchester-city';
  const demoAwayTeamId = 'arsenal';
  return {
    ...seed,
    _espn: undefined,
    id: DEMO_MATCH_ID,
    // Keep kickoff stable so client effects do not retrigger on every poll.
    kickoff: DEMO_KICKOFF_ISO,
    status: 'live',
    competition: `${seed.competition} (Demo)`,
    venue: `${seed.venue} - Demo Room`,
    clock: seed.clock || "67'",
    homeScore: seed.homeScore ?? 2,
    awayScore: seed.awayScore ?? 1,
    homeTeamId: demoHomeTeamId,
    awayTeamId: demoAwayTeamId,
    homeTeam: TEAMS[demoHomeTeamId],
    awayTeam: TEAMS[demoAwayTeamId],
    teamSheet: {
      home: {
        formation: '4-2-3-1',
        players: ['Donnarumma', "O'Reilly", 'Guehi', 'Khusanov', 'Nunes', 'Rodri', 'Silva', 'Doku', 'Cherki', 'Semenyo', 'Haaland'],
        positions: ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'RCM', 'LW', 'AM', 'RW', 'ST'],
        numbers: ['25', '82', '6', '45', '27', '16', '20', '11', '10', '19', '9'],
        subs: ['Kovačić', 'Aït-Nouri', 'Savinho', 'Foden', 'Trafford', 'Reijnders', 'Aké', 'Marmoush', 'González'],
        confirmed: true,
      },
      away: {
        formation: '4-2-3-1',
        players: ['Raya', 'White', 'Saliba', 'Gabriel', 'Lewis-Skelly', 'Zubimendi', 'Rice', 'Madueke', 'Havertz', 'Martinelli', 'Gyökeres'],
        positions: ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'LCM', 'RW', 'AM', 'LW', 'ST'],
        numbers: ['1', '4', '2', '6', '49', '36', '41', '20', '29', '11', '14'],
        subs: ['Mosquera', 'Jesus', 'Eze', 'Trossard', 'Dowman', 'Hincapié', 'Arrizabalaga', 'Nørgaard', 'Salmon'],
        confirmed: true,
      },
    },
    isDemo: true,
    events: seed.events ? [...seed.events] : undefined,
  };
}

// ---------- Simple in-memory cache ----------

let _cache: { matches: Match[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15_000; // 15 seconds — keeps live scores fresh

function prependDemoIfEnabled(matches: Match[]): Match[] {
  if (!INCLUDE_DEMO_MATCH) return matches;
  return [buildDemoLiveMatch(matches), ...matches];
}

/**
 * Fetch matches from ESPN, falling back to hardcoded fixtures if ESPN fails.
 * Optionally prepends a demo room when {@link INCLUDE_DEMO_MATCH} is true.
 */
export async function getMatches(): Promise<Match[]> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL) {
    return prependDemoIfEnabled(_cache.matches);
  }

  try {
    const espnMatches = await fetchAllMatches();
    if (espnMatches.length > 0) {
      // Fetch events (goal scorers) for live/finished matches in parallel
      const liveMatches = espnMatches.filter(m => m.status === 'live' || m.status === 'finished');
      if (liveMatches.length > 0) {
        const eventResults = await Promise.allSettled(
          liveMatches.map(m => {
            const eid = extractEspnId(m.id);
            if (!eid || !m._espn) return Promise.resolve([]);
            return fetchMatchEvents(eid, m._espn.leagueSlug, m.homeTeam.name);
          })
        );
        liveMatches.forEach((m, i) => {
          const r = eventResults[i];
          if (r.status === 'fulfilled' && r.value.length > 0) {
            m.events = r.value;
          }
        });
      }

      _cache = { matches: espnMatches, fetchedAt: now };
      return prependDemoIfEnabled(espnMatches);
    }
  } catch (err) {
    console.error('ESPN fetch failed, using fallback:', err);
  }

  // Fallback to hardcoded
  const fallback = buildFallbackMatches();
  _cache = { matches: fallback, fetchedAt: now };
  return prependDemoIfEnabled(fallback);
}

// Lineup cache: matchId -> { home, away } (short TTL for live matches, longer for finished)
const _lineupCache: Record<
  string,
  { home: Match['teamSheet']['home']; away: Match['teamSheet']['away']; fetchedAt: number; status: Match['status'] }
> = {};

function lineupTtl(status: Match['status']): number {
  if (status === 'live') return 20_000;        // 20s while live (subs, formation changes)
  if (status === 'finished') return 3_600_000; // 1h after FT (won't change)
  return 60_000;                               // 1m before kickoff (lineups get announced)
}

// Squad roster cache: espnTeamId -> player names (long TTL)
const _rosterCache: Record<string, { players: string[]; fetchedAt: number }> = {};
const ROSTER_TTL = 3_600_000; // 1 hour

async function ensureRoster(match: Match): Promise<void> {
  // Demo card ships a full teamSheet; do not fetch ESPN (would use wrong event id from seed).
  if (match.isDemo) return;
  if (!match._espn) return;
  const { homeTeamId, awayTeamId, leagueSlug } = match._espn;

  const espnEventId = extractEspnId(match.id);

  // 1) Always try the summary endpoint first - ESPN has predicted XI for upcoming matches too,
  //    actual XI once announced (~1hr before kickoff), and live updates for sub changes.
  if (espnEventId) {
    const cached = _lineupCache[match.id];
    const ttl = lineupTtl(match.status);
    const lineupsCacheHit =
      cached && cached.status === match.status && Date.now() - cached.fetchedAt < ttl;

    if (match.status === 'live' || match.status === 'finished') {
      // Cache hit: only need events (separate request); lineups unchanged.
      if (lineupsCacheHit) {
        match.teamSheet.home = { ...cached.home };
        match.teamSheet.away = { ...cached.away };
        const events = await fetchMatchEvents(espnEventId, leagueSlug, match.homeTeam.name);
        if (events.length > 0) {
          match.events = events;
        }
        return;
      }
      // One summary fetch fills both events and lineups (avoids duplicate summary HTTP).
      const summary = await fetchEspnMatchSummaryData(espnEventId, leagueSlug, match.status);
      if (summary) {
        const events = parseMatchEventsFromSummaryData(summary, match.homeTeam.name);
        if (events.length > 0) {
          match.events = events;
        }
        const lineups = parseMatchLineupsFromSummaryData(summary, match.status);
        if (lineups) {
          match.teamSheet.home = lineups.home;
          match.teamSheet.away = lineups.away;
          _lineupCache[match.id] = {
            home: { ...lineups.home },
            away: { ...lineups.away },
            fetchedAt: Date.now(),
            status: match.status,
          };
          return;
        }
      } else {
        const events = await fetchMatchEvents(espnEventId, leagueSlug, match.homeTeam.name);
        if (events.length > 0) {
          match.events = events;
        }
      }
    } else if (lineupsCacheHit) {
      match.teamSheet.home = { ...cached.home };
      match.teamSheet.away = { ...cached.away };
      return;
    }

    const lineups = await fetchMatchLineups(espnEventId, leagueSlug, match.status);
    if (lineups) {
      match.teamSheet.home = lineups.home;
      match.teamSheet.away = lineups.away;
      _lineupCache[match.id] = {
        home: { ...lineups.home },
        away: { ...lineups.away },
        fetchedAt: Date.now(),
        status: match.status,
      };
      return;
    }
  }

  // 2) Fallback: full squad roster (for upcoming matches or if summary has no lineups)
  await Promise.all([
    (async () => {
      if (match.teamSheet.home.players.length !== 0) return;
      const cached = _rosterCache[homeTeamId];
      if (cached && Date.now() - cached.fetchedAt < ROSTER_TTL) {
        match.teamSheet.home.players = cached.players;
        return;
      }
      const players = await fetchTeamRoster(homeTeamId, leagueSlug);
      if (players.length > 0) {
        _rosterCache[homeTeamId] = { players, fetchedAt: Date.now() };
        match.teamSheet.home.players = players;
      }
    })(),
    (async () => {
      if (match.teamSheet.away.players.length !== 0) return;
      const cached = _rosterCache[awayTeamId];
      if (cached && Date.now() - cached.fetchedAt < ROSTER_TTL) {
        match.teamSheet.away.players = cached.players;
        return;
      }
      const players = await fetchTeamRoster(awayTeamId, leagueSlug);
      if (players.length > 0) {
        _rosterCache[awayTeamId] = { players, fetchedAt: Date.now() };
        match.teamSheet.away.players = players;
      }
    })(),
  ]);
}

/**
 * Get a single match by ID, fetching rosters on demand if needed.
 * The demo room is only available when {@link INCLUDE_DEMO_MATCH} is true.
 */
export async function getMatch(id: string): Promise<Match | null> {
  if (id === DEMO_MATCH_ID) {
    if (!INCLUDE_DEMO_MATCH) return null;
    const allMatches = await getMatches();
    const sourceMatches = allMatches.filter((match) => !match.isDemo);
    return buildDemoLiveMatch(sourceMatches);
  }
  const all = await getMatches();
  const match = all.find(m => m.id === id) || null;
  if (match) {
    await ensureRoster(match);
  }
  return match;
}

export { TEAMS };
