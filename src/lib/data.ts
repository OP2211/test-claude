import type { Team, Match } from './types';
import { fetchAllMatches, fetchMatchLineups, fetchTeamRoster, extractEspnId } from './espn';

const TEAMS: Record<string, Team> = {
  'manchester-united': { name: 'Manchester United', shortName: 'MAN UTD', badge: '\u{1F534}', color: '#DA020E' },
  'liverpool':         { name: 'Liverpool',         shortName: 'LIV',     badge: '\u{1F534}', color: '#C8102E' },
  'arsenal':           { name: 'Arsenal',           shortName: 'ARS',     badge: '\u{1F534}', color: '#EF0107' },
  'chelsea':           { name: 'Chelsea',           shortName: 'CHE',     badge: '\u{1F535}', color: '#034694' },
  'manchester-city':   { name: 'Manchester City',   shortName: 'MCI',     badge: '\u{1F535}', color: '#6CABDD' },
  'tottenham':         { name: 'Tottenham',         shortName: 'TOT',     badge: '\u26AA', color: '#132257' },
  'barcelona':         { name: 'Barcelona',         shortName: 'BAR',     badge: '\u{1F535}\u{1F534}', color: '#A50044' },
  'real-madrid':       { name: 'Real Madrid',       shortName: 'RMA',     badge: '\u26AA', color: '#FEBE10' },
  'bayern-munich':     { name: 'Bayern Munich',     shortName: 'BAY',     badge: '\u{1F534}', color: '#DC052D' },
  'juventus':          { name: 'Juventus',          shortName: 'JUV',     badge: '\u26AB', color: '#000000' },
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

// ---------- Simple in-memory cache ----------

let _cache: { matches: Match[]; fetchedAt: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

/** Fetch matches from ESPN, falling back to hardcoded data on failure. */
export async function getMatches(): Promise<Match[]> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL) {
    return _cache.matches;
  }

  try {
    const espnMatches = await fetchAllMatches();
    if (espnMatches.length > 0) {
      // Enrich with known squad data when available
      for (const match of espnMatches) {
        const homePlayers = SQUAD_PLAYERS[match.homeTeamId];
        const awayPlayers = SQUAD_PLAYERS[match.awayTeamId];
        if (homePlayers) {
          match.teamSheet.home.players = homePlayers;
        }
        if (awayPlayers) {
          match.teamSheet.away.players = awayPlayers;
        }
      }
      _cache = { matches: espnMatches, fetchedAt: now };
      return espnMatches;
    }
  } catch (err) {
    console.error('ESPN fetch failed, using fallback:', err);
  }

  // Fallback to hardcoded
  const fallback = buildFallbackMatches();
  _cache = { matches: fallback, fetchedAt: now };
  return fallback;
}

// Lineup cache: matchId -> { home, away } (short TTL for live matches)
const _lineupCache: Record<string, { home: { formation: string; players: string[] }; away: { formation: string; players: string[] }; fetchedAt: number }> = {};
const LINEUP_TTL = 120_000; // 2 min (lineups can change with subs)

// Squad roster cache: espnTeamId -> player names (long TTL)
const _rosterCache: Record<string, { players: string[]; fetchedAt: number }> = {};
const ROSTER_TTL = 3_600_000; // 1 hour

async function ensureRoster(match: Match): Promise<void> {
  if (!match._espn) return;
  const { homeTeamId, awayTeamId, leagueSlug } = match._espn;
  const espnEventId = extractEspnId(match.id);

  // 1) Try actual match-day lineups from the summary endpoint (live/finished)
  if (espnEventId && (match.status === 'live' || match.status === 'finished')) {
    const cached = _lineupCache[match.id];
    if (cached && Date.now() - cached.fetchedAt < LINEUP_TTL) {
      match.teamSheet.home = { formation: cached.home.formation, players: cached.home.players, confirmed: true };
      match.teamSheet.away = { formation: cached.away.formation, players: cached.away.players, confirmed: true };
      return;
    }

    const lineups = await fetchMatchLineups(espnEventId, leagueSlug);
    if (lineups) {
      match.teamSheet.home = lineups.home;
      match.teamSheet.away = lineups.away;
      _lineupCache[match.id] = {
        home: { formation: lineups.home.formation, players: lineups.home.players },
        away: { formation: lineups.away.formation, players: lineups.away.players },
        fetchedAt: Date.now(),
      };
      return;
    }
  }

  // 2) Fallback: full squad roster (for upcoming matches or if summary has no lineups)
  if (match.teamSheet.home.players.length === 0) {
    const cached = _rosterCache[homeTeamId];
    if (cached && Date.now() - cached.fetchedAt < ROSTER_TTL) {
      match.teamSheet.home.players = cached.players;
    } else {
      const players = await fetchTeamRoster(homeTeamId, leagueSlug);
      if (players.length > 0) {
        _rosterCache[homeTeamId] = { players, fetchedAt: Date.now() };
        match.teamSheet.home.players = players;
      }
    }
  }

  if (match.teamSheet.away.players.length === 0) {
    const cached = _rosterCache[awayTeamId];
    if (cached && Date.now() - cached.fetchedAt < ROSTER_TTL) {
      match.teamSheet.away.players = cached.players;
    } else {
      const players = await fetchTeamRoster(awayTeamId, leagueSlug);
      if (players.length > 0) {
        _rosterCache[awayTeamId] = { players, fetchedAt: Date.now() };
        match.teamSheet.away.players = players;
      }
    }
  }
}

/** Get a single match by ID, fetching rosters on demand if needed. */
export async function getMatch(id: string): Promise<Match | null> {
  const all = await getMatches();
  const match = all.find(m => m.id === id) || null;
  if (match) {
    await ensureRoster(match);
  }
  return match;
}

export { TEAMS, SQUAD_PLAYERS };
