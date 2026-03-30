import type { Team, TeamId, Match } from './types';

const TEAMS: Record<TeamId, Team> = {
  'manchester-united': { name: 'Manchester United', shortName: 'MAN UTD', badge: '🔴', color: '#DA020E' },
  'liverpool':         { name: 'Liverpool',         shortName: 'LIV',     badge: '🔴', color: '#C8102E' },
  'arsenal':           { name: 'Arsenal',           shortName: 'ARS',     badge: '🔴', color: '#EF0107' },
  'chelsea':           { name: 'Chelsea',           shortName: 'CHE',     badge: '🔵', color: '#034694' },
  'manchester-city':   { name: 'Manchester City',   shortName: 'MCI',     badge: '🔵', color: '#6CABDD' },
  'tottenham':         { name: 'Tottenham',         shortName: 'TOT',     badge: '⚪', color: '#132257' },
  'barcelona':         { name: 'Barcelona',         shortName: 'BAR',     badge: '🔵🔴', color: '#A50044' },
  'real-madrid':       { name: 'Real Madrid',       shortName: 'RMA',     badge: '⚪', color: '#FEBE10' },
  'bayern-munich':     { name: 'Bayern Munich',     shortName: 'BAY',     badge: '🔴', color: '#DC052D' },
  'juventus':          { name: 'Juventus',          shortName: 'JUV',     badge: '⚫', color: '#000000' },
};

const SQUAD_PLAYERS: Record<TeamId, string[]> = {
  'manchester-united': ['Onana', 'Dalot', 'Maguire', 'Lindelöf', 'Shaw', 'Casemiro', 'Fernandes', 'Mount', 'Rashford', 'Højlund', 'Antony'],
  'liverpool':         ['Alisson', 'Alexander-Arnold', 'Konaté', 'Van Dijk', 'Robertson', 'Endo', 'Szoboszlai', 'Mac Allister', 'Salah', 'Núñez', 'Díaz'],
  'arsenal':           ['Raya', 'Ben White', 'Saliba', 'Gabriel', 'Zinchenko', 'Rice', 'Partey', 'Ødegaard', 'Saka', 'Havertz', 'Martinelli'],
  'chelsea':           ['Sánchez', 'James', 'Chalobah', 'Colwill', 'Chilwell', 'Caicedo', 'Gallagher', 'Palmer', 'Mudryk', 'Jackson', 'Sterling'],
  'manchester-city':   ['Ederson', 'Walker', 'Rúben Dias', 'Akanji', 'Gvardiol', 'Rodri', 'De Bruyne', 'Bernardo', 'Doku', 'Haaland', 'Foden'],
  'tottenham':         ['Vicario', 'Porro', 'Romero', 'Van de Ven', 'Udogie', 'Bissouma', 'Bentancur', 'Maddison', 'Kulusevski', 'Son', 'Richarlison'],
  'barcelona':         ['Ter Stegen', 'Koundé', 'Araujo', 'Christensen', 'Balde', 'Pedri', 'Gavi', 'De Jong', 'Yamal', 'Lewandowski', 'Torres'],
  'real-madrid':       ['Courtois', 'Carvajal', 'Militão', 'Alaba', 'Mendy', 'Valverde', 'Modrić', 'Kroos', 'Bellingham', 'Vinicius Jr', 'Rodrigo'],
  'bayern-munich':     ['Neuer', 'Mazraoui', 'Upamecano', 'Kim', 'Davies', 'Kimmich', 'Goretzka', 'Müller', 'Gnabry', 'Kane', 'Sané'],
  'juventus':          ['Szczesny', 'Danilo', 'Bremer', 'Gatti', 'Cambiaso', 'Fagioli', 'Locatelli', 'Rabiot', 'Chiesa', 'Vlahović', 'Kostic'],
};

function buildMatches(): Match[] {
  const now = new Date();
  const raw: Array<{ id: string; homeTeamId: TeamId; awayTeamId: TeamId; offsetHours: number; competition: string; venue: string; status: Match['status'] }> = [
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

let _matches: Match[] | null = null;

export function getMatches(): Match[] {
  if (!_matches) _matches = buildMatches();
  return _matches;
}

export function getMatch(id: string): Match | null {
  return getMatches().find(m => m.id === id) || null;
}

export { TEAMS };
