/**
 * Premier League era trophy data (1992–2022) for all 20 current EPL teams.
 * Only counts trophies won from the 1992-93 season onwards.
 */

export interface TrophyWin {
  type: 'Premier League' | 'FA Cup' | 'League Cup' | 'Champions League' | 'Europa League' | 'Club World Cup';
  years: number[];
  image: string;
}

const TROPHY_IMAGES: Record<TrophyWin['type'], string> = {
  'Premier League': '/trophies/premier-league.webp', // red default
  'FA Cup': '/trophies/fa-cup.webp',
  'League Cup': '/trophies/league-cup.webp',
  'Champions League': '/trophies/champions-league.webp',
  'Europa League': '/trophies/europa-league.webp',
  'Club World Cup': '/trophies/club-world-cup.webp',
};

/** Determine if a hex color is "blue-ish" to pick the right PL trophy image. */
function isBlueTeam(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return b > r && b > 100;
}

export interface TeamProfile {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  altColor: string;
  founded: number;
  stadium: string;
  capacity: string;
  manager: string;
  nickname: string;
  plEraTrophies: TrophyWin[];
  plEraTotalCount: number;
}

type TrophyInput = { type: TrophyWin['type']; years: number[] };

function profile(
  id: string, name: string, shortName: string, logo: string,
  color: string, altColor: string, founded: number,
  stadium: string, capacity: string, manager: string, nickname: string,
  trophies: TrophyInput[]
): TeamProfile {
  const blue = isBlueTeam(color);
  const withImages: TrophyWin[] = trophies.map(t => ({
    ...t,
    image: t.type === 'Premier League' && blue
      ? '/trophies/premier-league-blue.webp'
      : TROPHY_IMAGES[t.type],
  }));
  const total = withImages.reduce((sum, t) => sum + t.years.length, 0);
  return { id, name, shortName, logo, color, altColor, founded, stadium, capacity, manager, nickname, plEraTrophies: withImages, plEraTotalCount: total };
}

export const TEAM_PROFILES: TeamProfile[] = [
  profile(
    'manchester-united', 'Manchester United', 'Man United', '/team/360.png',
    '#DA020E', '#FFE500', 1878, 'Old Trafford', '74,310', 'Michael Carrick', 'The Red Devils',
    [
      { type: 'Premier League', years: [1993,1994,1996,1997,1999,2000,2001,2003,2007,2008,2009,2011,2013] },
      { type: 'FA Cup', years: [1994,1996,1999,2004,2016] },
      { type: 'League Cup', years: [2006,2009,2010,2017] },
      { type: 'Champions League', years: [1999,2008] },
      { type: 'Europa League', years: [2017] },
    ]
  ),
  profile(
    'chelsea', 'Chelsea', 'Chelsea', '/team/363.png',
    '#034694', '#DBA111', 1905, 'Stamford Bridge', '40,341', 'Liam Roseniar', 'The Blues',
    [
      { type: 'Premier League', years: [2005,2006,2010,2015,2017] },
      { type: 'FA Cup', years: [1997,2000,2007,2009,2010,2012,2018] },
      { type: 'League Cup', years: [1998,2005,2007,2015] },
      { type: 'Champions League', years: [2012,2021] },
      { type: 'Europa League', years: [2013,2019] },
      { type: 'Club World Cup', years: [2022] },
    ]
  ),
  profile(
    'manchester-city', 'Manchester City', 'Man City', '/team/382.png',
    '#6CABDD', '#1C2C5B', 1880, 'Etihad Stadium', '53,400', 'Pep Guardiola', 'The Citizens',
    [
      { type: 'Premier League', years: [2012,2014,2018,2019,2021,2022,2023,2024] },
      { type: 'FA Cup', years: [2011,2019,2023] },
      { type: 'League Cup', years: [2014,2016,2018,2019,2020,2021] },
      { type: 'Champions League', years: [2023] },
    ]
  ),
  profile(
    'arsenal', 'Arsenal', 'Arsenal', '/team/359.png',
    '#EF0107', '#063672', 1886, 'Emirates Stadium', '60,704', 'Mikel Arteta', 'The Gunners',
    [
      { type: 'Premier League', years: [1998,2002,2004] },
      { type: 'FA Cup', years: [1993,1998,2002,2003,2005,2014,2015,2017,2020] },
      { type: 'League Cup', years: [1993] },
    ]
  ),
  profile(
    'liverpool', 'Liverpool', 'Liverpool', '/team/364.png',
    '#C8102E', '#00B2A9', 1892, 'Anfield', '61,276', 'Arne Slot', 'The Reds',
    [
      { type: 'Premier League', years: [2020] },
      { type: 'FA Cup', years: [2001,2006,2022] },
      { type: 'League Cup', years: [1995,2001,2003,2012,2022] },
      { type: 'Champions League', years: [2005,2019] },
      { type: 'Europa League', years: [2001] },
    ]
  ),
  profile(
    'tottenham', 'Tottenham Hotspur', 'Spurs', '/team/367.png',
    '#132257', '#FFFFFF', 1882, 'Tottenham Hotspur Stadium', '62,850', 'Roberto De Zerbi', 'Spurs',
    [
      { type: 'League Cup', years: [1999,2008] },
    ]
  ),
  profile(
    'aston-villa', 'Aston Villa', 'Aston Villa', '/team/362.png',
    '#670E36', '#95BFE5', 1874, 'Villa Park', '42,657', 'Unai Emery', 'The Villans',
    [
      { type: 'League Cup', years: [1994,1996] },
    ]
  ),
  profile(
    'everton', 'Everton', 'Everton', '/team/368.png',
    '#003399', '#FFFFFF', 1878, 'Goodison Park', '39,414', 'David Moyes', 'The Toffees',
    [
      { type: 'FA Cup', years: [1995] },
    ]
  ),
  // Teams with 0 PL era trophies
  profile('newcastle-united', 'Newcastle United', 'Newcastle', '/team/361.png', '#241F20', '#FFFFFF', 1892, "St James' Park", '52,305', 'Eddie Howe', 'The Magpies', []),
  profile('west-ham-united', 'West Ham United', 'West Ham', '/team/371.png', '#7A263A', '#1BB1E7', 1895, 'London Stadium', '62,500', 'Nuno Espirito Santo', 'The Hammers', []),
  profile('leeds-united', 'Leeds United', 'Leeds', '/team/357.png', '#1D428A', '#FFCD00', 1919, 'Elland Road', '37,890', 'Daniel Farke', 'The Whites', []),
  profile('nottingham-forest', 'Nottingham Forest', "Nott'm Forest", '/team/393.png', '#DD0000', '#FFFFFF', 1865, 'City Ground', '30,332', 'Vitor Pereira', 'The Reds', []),
  profile('wolverhampton', 'Wolverhampton Wanderers', 'Wolves', '/team/380.png', '#FDB913', '#231F20', 1877, 'Molineux Stadium', '31,750', "Rob Edwards", 'Wolves', []),
  profile('sunderland', 'Sunderland', 'Sunderland', '/team/366.png', '#EB172B', '#211E1F', 1879, 'Stadium of Light', '49,000', 'Régis Le Bris', 'The Black Cats', []),
  profile('burnley', 'Burnley', 'Burnley', '/team/379.png', '#6C1D45', '#99D6EA', 1882, 'Turf Moor', '21,944', 'Scott Parker', 'The Clarets', []),
  profile('fulham', 'Fulham', 'Fulham', '/team/370.png', '#000000', '#CC0000', 1879, 'Craven Cottage', '29,600', 'Marco Silva', 'The Cottagers', []),
  profile('crystal-palace', 'Crystal Palace', 'Crystal Palace', '/team/384.png', '#1B458F', '#C4122E', 1905, 'Selhurst Park', '25,486', 'Oliver Glasner', 'The Eagles', []),
  profile('brighton', 'Brighton & Hove Albion', 'Brighton', '/team/331.png', '#0057B8', '#FFCD00', 1901, 'Amex Stadium', '31,876', 'Fabian Hürzeler', 'The Seagulls', []),
  profile('afc-bournemouth', 'AFC Bournemouth', 'Bournemouth', '/team/349.png', '#DA291C', '#000000', 1899, 'Vitality Stadium', '11,364', 'Andoni Iraola', 'The Cherries', []),
  profile('brentford', 'Brentford', 'Brentford', '/team/337.png', '#E30613', '#FBB800', 1889, 'Gtech Community Stadium', '17,250', 'Keith Andrews', 'The Bees', []),
].sort((a, b) => b.plEraTotalCount - a.plEraTotalCount);
