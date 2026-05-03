import type {
  BattingStat,
  BowlingStat,
  CricketInnings,
  CricketLeader,
  CricketMatch,
  CricketTeamInfo,
  FallOfWicket,
  InningsDetail,
  LiveBatsman,
  LiveBowler,
  LiveState,
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
      // ESPN sends a placeholder linescore for the innings each team didn't bat in
      // (e.g. period=1 for the chasing side, period=2 for the side that batted first).
      // We can't trust `c.score` here — it's the competitor-level current score and
      // gets attached to ALL of that team's linescores, not just the real one. So we
      // detect a real innings purely by the linescore values themselves.
      const hasRealInnings =
        ls.isBatting === true ||
        runs > 0 ||
        wickets > 0;
      if (!hasRealInnings) continue;
      out.push({
        period: ls.period ?? out.length + 1,
        teamId: teamInfo.id,
        runs,
        wickets,
        overs,
        isBatting: Boolean(ls.isBatting),
        display: c.score && c.score.trim() ? c.score : undefined,
      });
    }
  }
  // Deduplicate by (teamId, period)
  const seen = new Set<string>();
  const real = out.filter((i) => {
    const k = `${i.teamId}-${i.period}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // ESPN sometimes leaves `isBatting=true` on a completed earlier innings. Only the
  // highest-period innings can possibly be live; force every earlier one to false so
  // the UI doesn't show MI as "batting" once CSK has started chasing.
  if (real.length === 0) return real;
  const maxPeriod = Math.max(...real.map((i) => i.period));
  return real.map((i) =>
    i.period === maxPeriod ? i : { ...i, isBatting: false }
  );
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
  // For cricket, status.summary holds the human-readable result ("MI won by 99 runs"),
  // while status.type.detail is just a stage label like "Final". Prefer the summary.
  return event.status.summary || event.status.type.detail;
}

function winnerTeamIdFor(
  competitors: EspnCompetitor[],
  home: CricketTeamInfo,
  away: CricketTeamInfo,
): string | null {
  // ESPN ships winner as the string "true" / "false" on each competitor.
  for (const c of competitors) {
    if (String(c.winner).toLowerCase() === 'true') {
      return c.homeAway === 'home' ? home.id : away.id;
    }
  }
  return null;
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
    winnerTeamId: winnerTeamIdFor(competitors, homeFull, awayFull),
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
 * Fan out across a list of date params, collect every distinct event, normalise.
 * Pulled out as a helper so we can use a narrow window for the live match list
 * and a wide window for season-wide aggregates (standings + season leaders).
 */
async function fetchMatchesForDates(dates: string[]): Promise<CricketMatch[]> {
  const byId = new Map<string, CricketMatch>();

  for (const league of CRICKET_LEAGUES) {
    // Kick off all date fetches in parallel, plus the bare /scoreboard (live-featured event).
    const urls: Array<string | undefined> = [undefined, ...dates];
    // Run in batches to avoid socket exhaustion on large windows.
    const batchSize = 12;
    const results: PromiseSettledResult<EspnScoreboard>[] = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((d) => fetchScoreboardForDate(league.slug, d))
      );
      results.push(...batchResults);
    }

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

/**
 * ESPN's /scoreboard endpoint returns only the "featured" event, so we fan out
 * across a small recent window to collect every IPL fixture currently visible.
 * Used by the live match list — narrow on purpose so it polls cheaply.
 */
export async function fetchCricketMatches(): Promise<CricketMatch[]> {
  return fetchMatchesForDates(buildDateWindow(3, 7));
}

/**
 * Season-wide match fan-out — covers the full IPL window (~90 days back,
 * 30 days forward). Cached server-side for 5 minutes so repeated requests
 * (standings refresh, leaders aggregator) don't re-fan-out every time.
 */
let seasonCache: { matches: CricketMatch[]; expires: number } | null = null;
let seasonInflight: Promise<CricketMatch[]> | null = null;
const SEASON_TTL_MS = 5 * 60_000;

export async function fetchCricketSeasonMatches(): Promise<CricketMatch[]> {
  if (seasonCache && seasonCache.expires > Date.now()) return seasonCache.matches;
  if (seasonInflight) return seasonInflight;
  seasonInflight = (async () => {
    try {
      const matches = await fetchMatchesForDates(buildDateWindow(90, 30));
      seasonCache = { matches, expires: Date.now() + SEASON_TTL_MS };
      return matches;
    } finally {
      seasonInflight = null;
    }
  })();
  return seasonInflight;
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
  headshot?: { href?: string };
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

/** The leaf entry that actually carries batting/bowling/statistics for a single innings. */
interface EspnSummaryPlayerInnings {
  order?: number;
  /** Presence indicates this entry is a BATTING record. Holds dismissal metadata. */
  batting?: {
    active?: boolean;
    activeName?: string;
    order?: number;
    /** Last balls faced by this batter (strings: "0", "1", "4", "6", "W", "wd", etc.) */
    runsSummary?: string[];
    outDetails?: {
      shortText?: string;
      dismissalCard?: string;
      bowler?: { displayName?: string };
      fielders?: Array<{ athlete?: { displayName?: string } }>;
      details?: {
        text?: string;
        shortText?: string;
        innings?: { wickets?: number; runs?: number };
        over?: { overs?: number };
      };
    };
  };
  /** Presence indicates this entry is a BOWLING record. */
  bowling?: {
    active?: boolean;
    /** "current bowler", "previous bowler", "" */
    activeName?: string;
    order?: number;
    currentSpell?: {
      overs?: string | number;
      balls?: number;
      conceded?: string | number;
      wickets?: string | number;
      maidens?: string | number;
      spell?: number;
    };
  };
  /** Numeric stats for this player-innings. */
  statistics?: EspnSummaryStatistics;
}

/** The outer linescore entry. Holds the innings period and contains an inner array of records. */
interface EspnSummaryPlayerLinescore {
  period?: number;
  /** ESPN's actual structure: each outer entry wraps a nested linescores[] array. */
  linescores?: EspnSummaryPlayerInnings[];
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

interface EspnSummaryNote {
  type?: string;
  text?: string;
}

interface EspnSummaryPayload {
  rosters?: EspnSummaryRoster[];
  notes?: EspnSummaryNote[];
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
    headshot: raw.athlete?.headshot?.href,
    isCaptain: Boolean(raw.captain),
    isWicketKeeper: Boolean(raw.wicketKeeper),
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

function statString(stats: EspnSummaryStat[], name: string): string {
  const found = stats.find((s) => s.name === name);
  if (typeof found?.value === 'string') return found.value;
  if (typeof found?.displayValue === 'string') return found.displayValue;
  return '';
}

function hasBattingStats(stats: EspnSummaryStat[]): boolean {
  return stats.some((s) => s.name === 'ballsFaced' || s.name === 'battingPosition' || s.name === 'batted');
}

function hasBowlingStats(stats: EspnSummaryStat[]): boolean {
  return stats.some((s) => s.name === 'bowlingPosition' || s.name === 'overs' || s.name === 'bowled');
}

/** Build a dismissal string when ESPN didn't include `outDetails` (newer payload form). */
function dismissalFromCard(card: string): string {
  if (!card) return 'out';
  const c = card.toLowerCase();
  if (c === 'c') return 'caught';
  if (c === 'b') return 'bowled';
  if (c === 'lbw') return 'lbw';
  if (c === 'ro' || c === 'run out') return 'run out';
  if (c === 'st') return 'stumped';
  if (c === 'h' || c === 'hw' || c === 'hit wicket') return 'hit wicket';
  return card;
}

function formatDismissal(bat: NonNullable<EspnSummaryPlayerInnings['batting']>): string {
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

function isNotOut(bat: NonNullable<EspnSummaryPlayerInnings['batting']>): boolean {
  // Not out = either still active at the crease, or no dismissal info.
  if (bat.active) return true;
  if (!bat.outDetails) return true;
  if (!bat.outDetails.dismissalCard && !bat.outDetails.shortText) return true;
  return false;
}

/** Pull the most recent "Extras N" mention for a team out of the unstructured notes array. */
function extractExtrasFromNotes(notes: EspnSummaryNote[], teamName: string): number | undefined {
  const matchnotes = notes.filter((n) => (n.type || '').toLowerCase() === 'matchnote');
  // Pattern: "<Team>: 100 runs in 10.5 overs (65 balls), Extras 1"
  const re = new RegExp(
    `${teamName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}:.*?Extras\\s+(\\d+)`,
    'i'
  );
  let latest: number | undefined;
  for (const n of matchnotes) {
    const text = n.text || '';
    const m = text.match(re);
    if (m && m[1]) latest = Number(m[1]);
  }
  return latest;
}

function extractInningsDetails(summary: EspnSummaryPayload, base: CricketMatch): InningsDetail[] {
  const rosters = asArray<EspnSummaryRoster>(summary.rosters);
  const notes = asArray<EspnSummaryNote>(summary.notes);

  // ESPN represents batting under the BATTING side's roster linescore, and bowling under
  // the FIELDING side's roster linescore. We bucket by (period, battingTeamId).
  const battingByInnings = new Map<string, BattingStat[]>();
  const bowlingByInnings = new Map<string, BowlingStat[]>();
  const fowByInnings = new Map<string, FallOfWicket[]>();
  // Track which roster players appeared in the batting list per innings — anyone NOT in this set is "yet to bat".
  const battedNamesByInnings = new Map<string, Set<string>>();
  // Map roster name → roster meta for resolving headshots/badges quickly.
  const rosterMetaByTeam = new Map<string, Map<string, EspnSummaryRosterItem>>();

  for (const r of rosters) {
    const side = r.homeAway;
    const teamId = side === 'home' ? base.home.id : side === 'away' ? base.away.id : null;
    if (!teamId) continue;
    const opponentId = teamId === base.home.id ? base.away.id : base.home.id;

    const meta = new Map<string, EspnSummaryRosterItem>();
    rosterMetaByTeam.set(teamId, meta);

    for (const p of asArray<EspnSummaryRosterItem>(r.roster)) {
      const name = playerName(p.athlete);
      if (!name) continue;
      meta.set(name, p);
      const headshot = p.athlete?.headshot?.href;

      for (const outer of asArray<EspnSummaryPlayerLinescore>(p.linescores)) {
        const period = typeof outer.period === 'number' ? outer.period : 1;
        for (const ls of asArray<EspnSummaryPlayerInnings>(outer.linescores)) {
          const stats = collectStats(ls.statistics);

          // Detect role from either metadata presence (older payload) or stats list (newer payload).
          const looksLikeBatting = Boolean(ls.batting) || hasBattingStats(stats);
          const looksLikeBowling = Boolean(ls.bowling) || hasBowlingStats(stats);

          if (looksLikeBatting) {
            const balls = statValue(stats, 'ballsFaced');
            const runs = statValue(stats, 'runs');
            // `batted` is the only reliable "this player came to the crease" flag.
            // (`battingPosition` is just the slot 1-11 and is non-zero for the whole squad.)
            const batted = statValue(stats, 'batted') > 0;
            const outs = statValue(stats, 'outs');
            const notoutsStat = statValue(stats, 'notouts');
            const dismissalCardStat = statString(stats, 'dismissalCard').trim();
            // ESPN sometimes writes the literal string "not out" into dismissalCard for unbeaten batters.
            const dismissalCardIsOutMarker =
              dismissalCardStat.length > 0 && dismissalCardStat.toLowerCase() !== 'not out';
            const isOut = batted && (outs > 0 || dismissalCardIsOutMarker);
            const espnActive = ls.batting?.active === true;
            // Currently at the crease: live match + this team is batting + batter came in,
            // hasn't been dismissed, and hasn't been finalised as "not out" (notouts=1 only sets
            // after the innings ends).
            const teamIsBattingNow = base.innings.some(
              (i) => i.teamId === teamId && i.isBatting === true
            );
            const isLiveActive =
              espnActive ||
              (base.status === 'live' &&
                teamIsBattingNow &&
                batted &&
                outs === 0 &&
                notoutsStat === 0);

            // Skip players who never came to the crease (DNB).
            if (batted || espnActive) {
              const key = `${period}-${teamId}`;
              const arr = battingByInnings.get(key) ?? [];
              const battingOrder =
                (typeof ls.batting?.order === 'number' ? ls.batting?.order : undefined) ||
                statValue(stats, 'battingPosition') ||
                undefined;

              const dismissalText = isOut
                ? (ls.batting?.outDetails?.shortText
                    ? ls.batting.outDetails.shortText
                    : (ls.batting ? formatDismissal(ls.batting) : '') || dismissalFromCard(dismissalCardStat))
                : 'not out';

              arr.push({
                player: name,
                headshot,
                isCaptain: Boolean(p.captain),
                isWicketKeeper: Boolean(p.wicketKeeper),
                order: battingOrder,
                active: isLiveActive,
                runs,
                balls,
                fours: statValue(stats, 'fours'),
                sixes: statValue(stats, 'sixes'),
                strikeRate: statValue(stats, 'strikeRate'),
                dismissal: dismissalText,
                notOut: !isOut,
              });
              battingByInnings.set(key, arr);

              const seen = battedNamesByInnings.get(key) ?? new Set<string>();
              seen.add(name);
              battedNamesByInnings.set(key, seen);

              // Fall of wickets — only when ESPN ships outDetails with the inning snapshot.
              if (isOut && ls.batting?.outDetails?.details?.innings) {
                const innSnap = ls.batting.outDetails.details.innings;
                const overSnap = ls.batting.outDetails.details.over;
                const wkts = typeof innSnap.wickets === 'number' ? innSnap.wickets : undefined;
                const teamRuns = typeof innSnap.runs === 'number' ? innSnap.runs : undefined;
                const overs = typeof overSnap?.overs === 'number' ? overSnap.overs : undefined;
                if (wkts != null && teamRuns != null && overs != null) {
                  const fowArr = fowByInnings.get(key) ?? [];
                  fowArr.push({
                    wicketNo: wkts,
                    runs: teamRuns,
                    overs,
                    player: name,
                  });
                  fowByInnings.set(key, fowArr);
                }
              }
            }
          }

          if (looksLikeBowling) {
            const overs = statValue(stats, 'overs');
            const wickets = statValue(stats, 'wickets');
            const conceded = statValue(stats, 'conceded');
            // Skip bowlers who didn't bowl in this innings.
            if (overs > 0 || wickets > 0 || conceded > 0) {
              const key = `${period}-${opponentId}`;
              const arr = bowlingByInnings.get(key) ?? [];
              const bowlingOrder =
                (typeof ls.bowling?.order === 'number' ? ls.bowling?.order : undefined) ||
                statValue(stats, 'bowlingPosition') ||
                undefined;
              const isCurrent =
                ls.bowling?.active === true &&
                (ls.bowling.activeName || '').toLowerCase() === 'current bowler';
              arr.push({
                player: name,
                headshot,
                isCaptain: Boolean(p.captain),
                order: bowlingOrder,
                active: isCurrent,
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
  }

  // Real scorecards show batters in batting order (1 → 11). Falls back to runs descending if
  // ESPN didn't expose order.
  const sortBatting = (arr: BattingStat[]) =>
    arr.slice().sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      // last fallback: out-batters by runs desc, not-out batters at bottom
      if (a.notOut !== b.notOut) return a.notOut ? 1 : -1;
      return b.runs - a.runs;
    });
  // Bowlers in bowling order; if equal, descending wickets.
  const sortBowling = (arr: BowlingStat[]) =>
    arr.slice().sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.economy - b.economy;
    });

  // Resolve "yet to bat" by team: players in the squad/roster who aren't in the batted set.
  const yetToBatFor = (teamId: string, period: number): string[] => {
    const key = `${period}-${teamId}`;
    const batted = battedNamesByInnings.get(key) ?? new Set<string>();
    const meta = rosterMetaByTeam.get(teamId);
    if (!meta) return [];
    const out: string[] = [];
    for (const [name, p] of meta) {
      if (p.starter !== true) continue;
      if (batted.has(name)) continue;
      out.push(name);
    }
    return out;
  };

  return base.innings.map((inn) => {
    const team = inn.teamId === base.home.id ? base.home : base.away;
    const key = `${inn.period}-${inn.teamId}`;
    const fow = (fowByInnings.get(key) ?? []).slice().sort((a, b) => a.wicketNo - b.wicketNo);
    return {
      period: inn.period,
      teamId: inn.teamId,
      teamShortName: team.shortName,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      isBatting: inn.isBatting,
      extras: extractExtrasFromNotes(notes, team.name),
      batting: sortBatting(battingByInnings.get(key) ?? []),
      bowling: sortBowling(bowlingByInnings.get(key) ?? []),
      yetToBat: yetToBatFor(inn.teamId, inn.period),
      fallOfWickets: fow,
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

function extractLiveState(summary: EspnSummaryPayload, base: CricketMatch): LiveState | null {
  if (base.status !== 'live') return null;
  const rosters = asArray<EspnSummaryRoster>(summary.rosters);

  let battingTeamId: string | null = null;
  let bowlingTeamId: string | null = null;
  const batsmen: LiveBatsman[] = [];
  let bowler: LiveBowler | null = null;

  // First pass: find currently-batting team via the live innings (isBatting=true).
  const liveInn = base.innings.find((i) => i.isBatting);
  if (liveInn) {
    battingTeamId = liveInn.teamId;
    bowlingTeamId = liveInn.teamId === base.home.id ? base.away.id : base.home.id;
  }

  for (const r of rosters) {
    const side = r.homeAway;
    const teamId = side === 'home' ? base.home.id : side === 'away' ? base.away.id : null;
    if (!teamId) continue;

    for (const p of asArray<EspnSummaryRosterItem>(r.roster)) {
      const name = playerName(p.athlete);
      if (!name) continue;

      for (const outer of asArray<EspnSummaryPlayerLinescore>(p.linescores)) {
        for (const ls of asArray<EspnSummaryPlayerInnings>(outer.linescores)) {
          const stats = collectStats(ls.statistics);

          // Active batter detection: ESPN flag when present, else heuristic for live matches
          // (player batted, hasn't been dismissed, innings hasn't been finalised).
          const espnBatActive = ls.batting?.active === true;
          if (hasBattingStats(stats) || ls.batting) {
            const batted = statValue(stats, 'batted') > 0;
            const outs = statValue(stats, 'outs');
            const notoutsStat = statValue(stats, 'notouts');
            const teamIsBattingNow = base.innings.some(
              (i) => i.teamId === teamId && i.isBatting === true
            );
            const stillIn =
              base.status === 'live' &&
              teamIsBattingNow &&
              batted &&
              outs === 0 &&
              notoutsStat === 0;
            if (espnBatActive || stillIn) {
              batsmen.push({
                name,
                runs: statValue(stats, 'runs'),
                balls: statValue(stats, 'ballsFaced'),
                fours: statValue(stats, 'fours'),
                sixes: statValue(stats, 'sixes'),
                strikeRate: statValue(stats, 'strikeRate'),
                recentBalls: asArray<string>(ls.batting?.runsSummary).slice(-8),
              });
              if (!battingTeamId) battingTeamId = teamId;
            }
          }

          // Current bowler — only when ESPN explicitly tags one. Without `bowling.active`
          // the new payload doesn't expose this; live row highlight will be skipped silently.
          if (
            ls.bowling?.active === true &&
            (ls.bowling.activeName || '').toLowerCase() === 'current bowler' &&
            !bowler
          ) {
            const spell = ls.bowling.currentSpell;
            bowler = {
              name,
              overs: statValue(stats, 'overs'),
              maidens: statValue(stats, 'maidens'),
              runs: statValue(stats, 'conceded'),
              wickets: statValue(stats, 'wickets'),
              economy: statValue(stats, 'economyRate'),
              thisSpell: spell
                ? {
                    overs: num(spell.overs),
                    runs: num(spell.conceded),
                    wickets: num(spell.wickets),
                    maidens: num(spell.maidens),
                  }
                : undefined,
            };
            if (!bowlingTeamId) bowlingTeamId = teamId;
          }
        }
      }
    }
  }

  if (batsmen.length === 0 && !bowler && !liveInn) return null;

  const inningsRuns = liveInn?.runs;
  const inningsWickets = liveInn?.wickets;
  const inningsOvers = liveInn?.overs;
  const currentRunRate =
    typeof inningsRuns === 'number' && typeof inningsOvers === 'number' && inningsOvers > 0
      ? Number((inningsRuns / inningsOvers).toFixed(2))
      : undefined;

  return {
    battingTeamId,
    bowlingTeamId,
    batsmen,
    bowler,
    inningsRuns,
    inningsWickets,
    inningsOvers,
    currentRunRate,
  };
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

/** Enrich a base `CricketMatch` with playing XI + batting/bowling details + live state. */
export async function fetchCricketMatchDetailed(matchId: string): Promise<CricketMatch | null> {
  const base = await fetchCricketMatch(matchId);
  if (!base || !base._espn?.eventId) return base;
  const summary = await fetchCricketSummary(base._espn.eventId);
  if (!summary) return base;
  const live = extractLiveState(summary, base);
  return {
    ...base,
    inningsDetail: extractInningsDetails(summary, base),
    squad: extractSquad(summary),
    ...(live ? { live } : {}),
  };
}
