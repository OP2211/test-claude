import { TEAMS } from '@/lib/teams';
import { fetchStandings, type StandingEntry } from '@/lib/espn';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupportersByTeamId, type PublicProfile } from '@/lib/profile-repo';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface EspnScoreboardCompetitor {
  id: string;
  score: string;
}

interface EspnScoreboardEvent {
  competitions?: Array<{
    competitors?: EspnScoreboardCompetitor[];
  }>;
  status?: {
    type?: {
      completed?: boolean;
    };
  };
}

interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

interface TeamSupporterPreview {
  google_sub: string;
  username: string;
  image: string | null;
}

interface TeamCardCacheRow {
  team_id: string;
  team_name: string;
  team_color: string;
  team_logo: string;
  rank: number | null;
  wins: number;
  draws: number;
  losses: number;
  supporters_count: number;
  top_supporters: TeamSupporterPreview[];
  last_five: Array<'W' | 'D' | 'L'>;
  updated_at: string;
}

export interface TeamCardData {
  teamId: string;
  teamName: string;
  teamColor: string;
  teamLogo: string;
  rank: number | null;
  wins: number;
  draws: number;
  losses: number;
  supportersCount: number;
  topSupporters: TeamSupporterPreview[];
  lastFive: Array<'W' | 'D' | 'L'>;
  updatedAt: string;
}

interface TeamCardUpsertRow {
  team_id: string;
  team_name: string;
  team_color: string;
  team_logo: string;
  rank: number | null;
  wins: number;
  draws: number;
  losses: number;
  supporters_count: number;
  top_supporters: TeamSupporterPreview[];
  last_five: Array<'W' | 'D' | 'L'>;
}

function toEspnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function parseMatchResult(
  event: EspnScoreboardEvent,
  formMap: Map<string, Array<'W' | 'D' | 'L'>>,
) {
  if (!event.status?.type?.completed) return;

  const competitors = event.competitions?.[0]?.competitors ?? [];
  if (competitors.length !== 2) return;
  const [first, second] = competitors;
  const firstScore = Number.parseInt(first.score, 10);
  const secondScore = Number.parseInt(second.score, 10);
  if (Number.isNaN(firstScore) || Number.isNaN(secondScore)) return;

  const firstResult: 'W' | 'D' | 'L' =
    firstScore > secondScore ? 'W' : firstScore === secondScore ? 'D' : 'L';
  const secondResult: 'W' | 'D' | 'L' =
    secondScore > firstScore ? 'W' : secondScore === firstScore ? 'D' : 'L';

  const firstList = formMap.get(first.id) ?? [];
  if (firstList.length < 5) {
    firstList.push(firstResult);
    formMap.set(first.id, firstList);
  }

  const secondList = formMap.get(second.id) ?? [];
  if (secondList.length < 5) {
    secondList.push(secondResult);
    formMap.set(second.id, secondList);
  }
}

async function fetchLastFiveByTeam(): Promise<Map<string, Array<'W' | 'D' | 'L'>>> {
  const now = new Date();
  const start = new Date(now.getTime() - 70 * 24 * 3600_000);
  const dateRange = `${toEspnDate(start)}-${toEspnDate(now)}`;
  const url = `${ESPN_BASE}/eng.1/scoreboard?dates=${dateRange}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return new Map();
    const data = (await res.json()) as EspnScoreboardResponse;
    const events = data.events ?? [];

    const formMap = new Map<string, Array<'W' | 'D' | 'L'>>();
    for (const event of [...events].reverse()) {
      parseMatchResult(event, formMap);
    }
    return formMap;
  } catch {
    return new Map();
  }
}

function pickTopSupporters(supporters: PublicProfile[]): TeamSupporterPreview[] {
  return supporters.slice(0, 3).map((supporter) => ({
    google_sub: supporter.google_sub,
    username: supporter.username,
    image: supporter.image,
  }));
}

function toTeamCardData(row: TeamCardCacheRow): TeamCardData {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    teamColor: row.team_color,
    teamLogo: row.team_logo,
    rank: row.rank,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    supportersCount: row.supporters_count,
    topSupporters: row.top_supporters ?? [],
    lastFive: row.last_five ?? [],
    updatedAt: row.updated_at,
  };
}

function hasFreshRows(rows: TeamCardCacheRow[]): boolean {
  if (rows.length !== TEAMS.length) return false;
  return rows.every((row) => Date.now() - new Date(row.updated_at).getTime() <= CACHE_TTL_MS);
}

export async function getTeamCardsCache(): Promise<{ rows: TeamCardData[]; isFresh: boolean }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { rows: [], isFresh: false };
  }

  const { data, error } = await supabaseAdmin
    .from('team_cards_cache')
    .select(
      'team_id,team_name,team_color,team_logo,rank,wins,draws,losses,supporters_count,top_supporters,last_five,updated_at',
    )
    .order('rank', { ascending: true, nullsFirst: false });

  if (error) {
    return { rows: [], isFresh: false };
  }

  const typedRows = (data ?? []) as TeamCardCacheRow[];
  return {
    rows: typedRows.map(toTeamCardData),
    isFresh: hasFreshRows(typedRows),
  };
}

export async function refreshTeamCardsCache(): Promise<void> {
  const [standings, supportersByTeam, recentFormByEspnTeamId] = await Promise.all([
    fetchStandings('eng.1'),
    Promise.all(
      TEAMS.map(async (team) => ({
        teamId: team.id,
        supporters: await getSupportersByTeamId(team.id),
      })),
    ),
    fetchLastFiveByTeam(),
  ]);

  const standingsByLogo = new Map(standings.map((entry) => [entry.logo, entry]));
  const supportersMap = new Map(supportersByTeam.map((entry) => [entry.teamId, entry.supporters]));

  const payload: TeamCardUpsertRow[] = TEAMS.map((team) => {
    const standing = standingsByLogo.get(team.logo) as StandingEntry | undefined;
    const supporters = supportersMap.get(team.id) ?? [];
    const lastFive = standing ? (recentFormByEspnTeamId.get(standing.teamId) ?? []) : [];

    return {
      team_id: team.id,
      team_name: team.name,
      team_color: team.color,
      team_logo: team.logo,
      rank: standing?.position ?? null,
      wins: standing?.wins ?? 0,
      draws: standing?.draws ?? 0,
      losses: standing?.losses ?? 0,
      supporters_count: supporters.length,
      top_supporters: pickTopSupporters(supporters),
      last_five: lastFive,
    };
  });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('team_cards_cache').upsert(payload, { onConflict: 'team_id' });
}

export async function buildTeamCardsSnapshot(): Promise<TeamCardData[]> {
  const [standings, supportersByTeam, recentFormByEspnTeamId] = await Promise.all([
    fetchStandings('eng.1'),
    Promise.all(
      TEAMS.map(async (team) => ({
        teamId: team.id,
        supporters: await getSupportersByTeamId(team.id),
      })),
    ),
    fetchLastFiveByTeam(),
  ]);

  const standingsByLogo = new Map(standings.map((entry) => [entry.logo, entry]));
  const supportersMap = new Map(supportersByTeam.map((entry) => [entry.teamId, entry.supporters]));
  const nowIso = new Date().toISOString();

  const rows: TeamCardData[] = TEAMS.map((team) => {
    const standing = standingsByLogo.get(team.logo);
    const supporters = supportersMap.get(team.id) ?? [];
    const lastFive = standing ? (recentFormByEspnTeamId.get(standing.teamId) ?? []) : [];

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      teamLogo: team.logo,
      rank: standing?.position ?? null,
      wins: standing?.wins ?? 0,
      draws: standing?.draws ?? 0,
      losses: standing?.losses ?? 0,
      supportersCount: supporters.length,
      topSupporters: pickTopSupporters(supporters),
      lastFive,
      updatedAt: nowIso,
    };
  });

  return rows.sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return a.teamName.localeCompare(b.teamName);
  });
}
