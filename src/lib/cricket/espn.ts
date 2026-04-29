import type {
  BattingStat,
  BowlingStat,
  CricketInnings,
  CricketLeader,
  CricketMatch,
  CricketTeamInfo,
  InningsDetail,
  PlayerRole,
  SquadPlayer,
} from './types';
import { resolveCricketTeam } from './teams';

const ESPN_CRICKET_BASE = 'https://site.api.espn.com/apis/site/v2/sports/cricket';

export const CRICKET_LEAGUES = [
  { slug: '8048', key: 'ipl' as const, name: 'Indian Premier League' },
];

interface EspnLinescore {
  period: number;
  runs?: number;
  wickets?: number;
  overs?: number;
  isBatting?: boolean;
  displayValue?: string | number;
}

interface EspnTeam {
  id: string;
  displayName: string;
  abbreviation?: string;
  shortDisplayName?: string;
  color?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
}

interface EspnCompetitor {
  team: EspnTeam;
  homeAway: 'home' | 'away';
  score?: string;
  winner?: string;
  linescores?: EspnLinescore[];
  leaders?: Array<{
    name: string;
    displayName: string;
    leaders?: Array<{
      displayValue?: string;
      value?: number;
      athlete?: { displayName?: string };
    }>;
  }>;
}

interface EspnCompetition {
  venue?: {
    fullName?: string;
    address?: { city?: string; country?: string };
  };
  competitors: EspnCompetitor[];
}

interface EspnEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  description?: string;
  status: {
    type: { state: 'pre' | 'in' | 'post'; description?: string; detail?: string };
    summary?: string;
  };
  competitions: EspnCompetition[];
}

interface EspnScoreboard {
  events?: EspnEvent[];
}

/** ESPN occasionally returns non-array shapes where arrays are documented
 * (objects, null, missing). Coerce defensively so we never iterate garbage. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function preferLogo(team: EspnTeam): string | undefined {
  if (team.logo) return team.logo;
  const logos = asArray<{ href?: string }>(team.logos);
  const alt = logos.find((l) => l.href)?.href;
  return alt;
}

function toStatus(state: string): CricketMatch['status'] {
  if (state === 'in') return 'live';
  if (state === 'post') return 'finished';
  return 'upcoming';
}

function toInnings(
  competitors: EspnCompetitor[],
  home: CricketTeamInfo,
  away: CricketTeamInfo
): CricketInnings[] {
  const out: CricketInnings[] = [];
  for (const c of asArray<EspnCompetitor>(competitors)) {
    const teamInfo = c.homeAway === 'home' ? home : away;
    const lines = asArray<EspnLinescore>(c.linescores);
    for (const ls of lines) {
      const runs = typeof ls.runs === 'number' ? ls.runs : 0;
      const wickets = typeof ls.wickets === 'number' ? ls.wickets : 0;
      const overs = typeof ls.overs === 'number' ? ls.overs : 0;
      if (runs === 0 && wickets === 0 && overs === 0 && !ls.isBatting) {
        // Skip placeholder innings (e.g. team yet to bat)
        continue;
      }
      out.push({
        period: ls.period ?? out.length + 1,
        teamId: teamInfo.id,
        runs,
        wickets,
        overs,
        isBatting: Boolean(ls.isBatting) || Boolean(c.score && c.score.trim().length > 0),
        display: c.score && c.score.trim() ? c.score : undefined,
      });
    }
  }
  // Deduplicate by (teamId, period)
  const seen = new Set<string>();
  return out.filter((i) => {
    const k = `${i.teamId}-${i.period}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function toLeaders(
  competitors: EspnCompetitor[],
  home: CricketTeamInfo,
  away: CricketTeamInfo
): CricketLeader[] {
  const out: CricketLeader[] = [];
  for (const c of asArray<EspnCompetitor>(competitors)) {
    const teamId = c.homeAway === 'home' ? home.id : away.id;
    const groups = asArray<NonNullable<EspnCompetitor['leaders']>[number]>(c.leaders);
    for (const group of groups) {
      const inner = asArray<{
        displayValue?: string;
        value?: number;
        athlete?: { displayName?: string };
      }>(group.leaders);
      const top = inner[0];
      if (!top?.athlete?.displayName) continue;
      out.push({
        label: group.displayName || group.name,
        athlete: top.athlete.displayName,
        value: top.displayValue ?? String(top.value ?? ''),
        teamId,
      });
    }
  }
  return out;
}

function resultFromStatus(event: EspnEvent): string | undefined {
  if (event.status.type.state !== 'post') return undefined;
  return event.status.type.detail || event.status.summary;
}

function normaliseEvent(event: EspnEvent, leagueKey: 'ipl', leagueName: string): CricketMatch | null {
  const competitions = asArray<EspnCompetition>(event.competitions);
  const comp = competitions[0];
  const competitors = asArray<EspnCompetitor>(comp?.competitors);
  if (!comp || competitors.length < 2) return null;

  const homeC = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const awayC = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];

  const home = resolveCricketTeam(homeC.team.id, homeC.team.displayName);
  const away = resolveCricketTeam(awayC.team.id, awayC.team.displayName);

  // Prefer ESPN-supplied logos where present (IPL scoreboard reliably includes cricket CDN logos)
  const withLogo = (base: CricketTeamInfo, team: EspnTeam): CricketTeamInfo => {
    const espnLogo = preferLogo(team);
    return espnLogo ? { ...base, logo: espnLogo } : base;
  };

  const homeFull = withLogo(home, homeC.team);
  const awayFull = withLogo(away, awayC.team);

  return {
    id: `cricket-${event.id}`,
    sport: 'cricket',
    league: leagueKey,
    leagueName,
    home: homeFull,
    away: awayFull,
    start: event.date,
    status: toStatus(event.status.type.state),
    description: event.description,
    venue: comp.venue?.fullName ?? 'TBA',
    city: comp.venue?.address?.city,
    innings: toInnings(competitors, homeFull, awayFull),
    toss: event.status.summary,
    result: resultFromStatus(event),
    leaders: toLeaders(competitors, homeFull, awayFull),
    _espn: { eventId: event.id },
  };
}

async function fetchScoreboardForDate(slug: string, dateParam?: string): Promise<EspnScoreboard> {
  const url = dateParam
    ? `${ESPN_CRICKET_BASE}/${slug}/scoreboard?dates=${dateParam}`
    : `${ESPN_CRICKET_BASE}/${slug}/scoreboard`;
  // Scoreboard can switch between featured events at any moment; always fresh.
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN scoreboard fetch failed: ${res.status}`);
  return (await res.json()) as EspnScoreboard;
}

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Build a ±N-day window of date params, newest-last. */
function buildDateWindow(daysBefore: number, daysAfter: number): string[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(ymd(d));
  }
  return out;
}

/**
 * ESPN's /scoreboard endpoint returns only the "featured" event, so we fan out
 * across a date window to collect all IPL fixtures currently visible to ESPN.
 * Each call is cheap and cached upstream by ESPN; results are deduped by event id.
 */
export async function fetchCricketMatches(): Promise<CricketMatch[]> {
  const byId = new Map<string, CricketMatch>();
  const dates = buildDateWindow(3, 7);

  for (const league of CRICKET_LEAGUES) {
    // Kick off all date fetches in parallel, plus the bare /scoreboard (live-featured event).
    const urls: Array<string | undefined> = [undefined, ...dates];
    const results = await Promise.allSettled(
      urls.map((d) => fetchScoreboardForDate(league.slug, d))
    );

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const events = asArray<EspnEvent>(r.value.events);
      for (const ev of events) {
        if (!ev?.id || byId.has(ev.id)) continue;
        const m = normaliseEvent(ev, league.key, league.name);
        if (m) byId.set(ev.id, m);
      }
    }
  }

  const all = Array.from(byId.values());
  all.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return all;
}

export async function fetchCricketMatch(matchId: string): Promise<CricketMatch | null> {
  // Our matchId format: 'cricket-<espnEventId>'
  const eventId = matchId.startsWith('cricket-') ? matchId.slice('cricket-'.length) : matchId;
  const all = await fetchCricketMatches();
  return all.find((m) => m._espn?.eventId === eventId) ?? null;
}

export function isCricketMatchId(id: string): boolean {
  return id.startsWith('cricket-');
}

/* ──────────────────────────────────────────────────────────────────────
 * Summary endpoint — playing XI, per-batter / per-bowler stats
 * ────────────────────────────────────────────────────────────────────── */

interface EspnSummaryAthlete {
  id?: string;
  name?: string;
  displayName?: string;
  shortName?: string;
  battingName?: string;
}

interface EspnSummaryStat {
  name: string;
  value?: number | string;
  displayValue?: string;
}

interface EspnSummaryStatistics {
  categories?: Array<{
    name?: string;
    stats?: EspnSummaryStat[];
  }>;
}

interface EspnSummaryPlayerLinescore {
  period?: number;
  /** Presence indicates this linescore is a BATTING record. Holds dismissal metadata only. */
  batting?: {
    active?: boolean;
    activeName?: string;
    order?: number;
    outDetails?: {
      shortText?: string;
      dismissalCard?: string;
      bowler?: { displayName?: string };
      fielders?: Array<{ athlete?: { displayName?: string } }>;
      details?: { text?: string; shortText?: string };
    };
  };
  /** Presence indicates this linescore is a BOWLING record. Numeric stats live in `statistics`. */
  bowling?: {
    active?: boolean;
    order?: number;
  };
  /** The actual numeric stats for this innings — both batting and bowling. */
  statistics?: EspnSummaryStatistics;
}

interface EspnSummaryRosterItem {
  athlete?: EspnSummaryAthlete;
  position?: { id?: string; name?: string; abbreviation?: string };
  captain?: boolean;
  wicketKeeper?: boolean;
  starter?: boolean;
  linescores?: EspnSummaryPlayerLinescore[];
}

interface EspnSummaryRoster {
  homeAway?: 'home' | 'away';
  team?: EspnTeam;
  roster?: EspnSummaryRosterItem[];
}

interface EspnSummaryPayload {
  rosters?: EspnSummaryRoster[];
  gameInfo?: {
    venue?: { fullName?: string; address?: { city?: string; country?: string } };
  };
}

function mapPlayerRole(raw: EspnSummaryRosterItem): PlayerRole {
  const id = (raw.position?.id || '').toUpperCase();
  if (raw.wicketKeeper || id === 'WK' || id === 'WBT') return 'wicketkeeper';
  if (id === 'AR' || id === 'BAR') return 'allrounder';
  if (id === 'BL' || id === 'BOWL' || id === 'B') return 'bowler';
  if (id === 'BT' || id === 'BAT' || id === 'MBT' || id === 'OBT') return 'batter';
  return 'unknown';
}

function playerBadge(raw: EspnSummaryRosterItem): string | undefined {
  if (raw.captain && raw.wicketKeeper) return 'C & WK';
  if (raw.captain) return 'C';
  if (raw.wicketKeeper) return 'WK';
  return undefined;
}

function playerName(athlete: EspnSummaryAthlete | undefined): string {
  if (!athlete) return '';
  // Prefer displayName (always present); battingName is the cricket scorecard form ("MR Marsh").
  return athlete.displayName || athlete.battingName || athlete.shortName || athlete.name || '';
}

function toSquadPlayer(raw: EspnSummaryRosterItem): SquadPlayer | null {
  const id = raw.athlete?.id || '';
  const name = playerName(raw.athlete);
  if (!name) return null;
  return {
    id,
    name,
    displayName: raw.athlete?.displayName || name,
    role: mapPlayerRole(raw),
    badge: playerBadge(raw),
  };
}

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Pull stats[] flat from statistics.categories[].stats[] (a category-keyed structure). */
function collectStats(statistics: EspnSummaryStatistics | undefined): EspnSummaryStat[] {
  const cats = asArray<NonNullable<EspnSummaryStatistics['categories']>[number]>(statistics?.categories);
  const out: EspnSummaryStat[] = [];
  for (const c of cats) {
    for (const s of asArray<EspnSummaryStat>(c.stats)) out.push(s);
  }
  return out;
}

function statValue(stats: EspnSummaryStat[], name: string): number {
  const found = stats.find((s) => s.name === name);
  return num(found?.value);
}

function formatDismissal(bat: NonNullable<EspnSummaryPlayerLinescore['batting']>): string {
  // ESPN gives a ready-made cricket-scorecard dismissal string in `outDetails.shortText`
  // (e.g. "c Parag b Burger"). Use it when present.
  if (bat.outDetails?.shortText) return bat.outDetails.shortText;

  const card = bat.outDetails?.dismissalCard;
  const bowler = bat.outDetails?.bowler?.displayName;
  const fielders = asArray<{ athlete?: { displayName?: string } }>(bat.outDetails?.fielders)
    .map((f) => f.athlete?.displayName)
    .filter((n): n is string => Boolean(n));

  if (card === 'c' && fielders[0] && bowler) return `c ${fielders[0]} b ${bowler}`;
  if (card === 'run out') return fielders[0] ? `run out (${fielders[0]})` : 'run out';
  if (card === 'lbw' && bowler) return `lbw b ${bowler}`;
  if (card && bowler) return `${card} b ${bowler}`;
  if (bowler) return `b ${bowler}`;
  if (card) return card;

  return '';
}

function isNotOut(bat: NonNullable<EspnSummaryPlayerLinescore['batting']>): boolean {
  // Not out = either still active at the crease, or no dismissal info.
  if (bat.active) return true;
  if (!bat.outDetails) return true;
  if (!bat.outDetails.dismissalCard && !bat.outDetails.shortText) return true;
  return false;
}

function extractInningsDetails(summary: EspnSummaryPayload, base: CricketMatch): InningsDetail[] {
  const rosters = asArray<EspnSummaryRoster>(summary.rosters);
  // ESPN represents batting under the BATTING side's roster linescore, and bowling under
  // the FIELDING side's roster linescore. We bucket by (period, battingTeamId).
  const battingByInnings = new Map<string, BattingStat[]>();
  const bowlingByInnings = new Map<string, BowlingStat[]>();

  for (const r of rosters) {
    const side = r.homeAway;
    const teamId = side === 'home' ? base.home.id : side === 'away' ? base.away.id : null;
    if (!teamId) continue;
    const opponentId = teamId === base.home.id ? base.away.id : base.home.id;

    for (const p of asArray<EspnSummaryRosterItem>(r.roster)) {
      const name = playerName(p.athlete);
      if (!name) continue;

      for (const ls of asArray<EspnSummaryPlayerLinescore>(p.linescores)) {
        const period = typeof ls.period === 'number' ? ls.period : 1;
        const stats = collectStats(ls.statistics);

        if (ls.batting) {
          const balls = statValue(stats, 'ballsFaced');
          const runs = statValue(stats, 'runs');
          const hasOut = Boolean(ls.batting.outDetails?.dismissalCard || ls.batting.outDetails?.shortText);
          // Skip players who never came to the crease (DNB).
          if (balls > 0 || runs > 0 || hasOut || ls.batting.active) {
            const key = `${period}-${teamId}`;
            const arr = battingByInnings.get(key) ?? [];
            arr.push({
              player: name,
              runs,
              balls,
              fours: statValue(stats, 'fours'),
              sixes: statValue(stats, 'sixes'),
              strikeRate: statValue(stats, 'strikeRate'),
              dismissal: isNotOut(ls.batting) ? 'not out' : formatDismissal(ls.batting),
              notOut: isNotOut(ls.batting),
            });
            battingByInnings.set(key, arr);
          }
        }

        if (ls.bowling) {
          const overs = statValue(stats, 'overs');
          const wickets = statValue(stats, 'wickets');
          const conceded = statValue(stats, 'conceded');
          // Skip bowlers who didn't bowl in this innings.
          if (overs > 0 || wickets > 0 || conceded > 0) {
            const key = `${period}-${opponentId}`;
            const arr = bowlingByInnings.get(key) ?? [];
            arr.push({
              player: name,
              overs,
              maidens: statValue(stats, 'maidens'),
              runs: conceded,
              wickets,
              economy: statValue(stats, 'economyRate'),
            });
            bowlingByInnings.set(key, arr);
          }
        }
      }
    }
  }

  // Sort batters by batting order is hard without explicit position info. ESPN gives `batting.order`
  // — but we already pushed in roster-iteration order. Sort batters by runs descending as a sane default
  // when order isn't explicit, and bowlers by wickets descending.
  const sortBatting = (arr: BattingStat[]) =>
    arr.slice().sort((a, b) => {
      // Not-out batters at the bottom (currently batting), descending by runs above
      if (a.notOut !== b.notOut) return a.notOut ? 1 : -1;
      return b.runs - a.runs;
    });
  const sortBowling = (arr: BowlingStat[]) =>
    arr.slice().sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.economy - b.economy;
    });

  // Build an InningsDetail per entry in base.innings, enriched with batting/bowling
  return base.innings.map((inn) => {
    const team = inn.teamId === base.home.id ? base.home : base.away;
    const key = `${inn.period}-${inn.teamId}`;
    return {
      period: inn.period,
      teamId: inn.teamId,
      teamShortName: team.shortName,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      isBatting: inn.isBatting,
      batting: sortBatting(battingByInnings.get(key) ?? []),
      bowling: sortBowling(bowlingByInnings.get(key) ?? []),
      display: inn.display,
    } satisfies InningsDetail;
  });
}

function extractSquad(summary: EspnSummaryPayload): { home: SquadPlayer[]; away: SquadPlayer[] } {
  const rosters = asArray<EspnSummaryRoster>(summary.rosters);
  const out = { home: [] as SquadPlayer[], away: [] as SquadPlayer[] };
  for (const r of rosters) {
    const items = asArray<EspnSummaryRosterItem>(r.roster);
    // Prefer starters when ESPN flags them; otherwise show everything provided.
    const flagged = items.filter((p) => p.starter === true);
    const sourceList = flagged.length > 0 ? flagged : items;
    const players = sourceList
      .map(toSquadPlayer)
      .filter((p): p is SquadPlayer => Boolean(p));
    if (r.homeAway === 'home') out.home = players;
    else if (r.homeAway === 'away') out.away = players;
  }
  return out;
}

async function fetchCricketSummary(eventId: string): Promise<EspnSummaryPayload | null> {
  for (const league of CRICKET_LEAGUES) {
    const url = `${ESPN_CRICKET_BASE}/${league.slug}/summary?event=${eventId}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      return (await res.json()) as EspnSummaryPayload;
    } catch {
      /* try next league */
    }
  }
  return null;
}

/** Enrich a base `CricketMatch` with playing XI + batting/bowling details. */
export async function fetchCricketMatchDetailed(matchId: string): Promise<CricketMatch | null> {
  const base = await fetchCricketMatch(matchId);
  if (!base || !base._espn?.eventId) return base;
  const summary = await fetchCricketSummary(base._espn.eventId);
  if (!summary) return base;
  return {
    ...base,
    inningsDetail: extractInningsDetails(summary, base),
    squad: extractSquad(summary),
  };
}
