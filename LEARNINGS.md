# LEARNINGS.md

Lessons baked into this codebase. Specific, not generic — every section ties back to a file, a function, or a bug we actually hit.

---

## 1. App architecture: extending one sport into N

The interesting decision was **what to leave alone**. When IPL cricket got bolted onto a football-only app, the impulse was to refactor `/matches` → `/football/matches` for symmetry. We didn't. Football kept its existing routes; cricket got a new tree at `/cricket/matches/*`. Existing shareable URLs survived, the diff stayed small, and the asymmetry (one sport at the root, the other prefixed) was explicitly accepted as MVP cost.

**The matchId namespace trick** is the load-bearing piece. Every cricket match id is `cricket-${espnEventId}` (see [src/lib/cricket/espn.ts:215](src/lib/cricket/espn.ts#L215) `id: \`cricket-${event.id}\``). Football match ids have no prefix. Storage that's keyed on `match_id` — chat messages, votes, Pusher channels — is automatically partitioned by sport without a single `WHERE sport = …` clause. The same `chat_messages` table holds both; queries use `match_id LIKE 'cricket-%'` for cricket-only scoping ([src/lib/profile-repo.ts:436](src/lib/profile-repo.ts#L436)).

Three things stayed sport-agnostic on purpose: the chat system, auth/profiles, and the leaderboard table (just scoped by query param). What got per-sport was: routes, match data fetchers, voting types, fan-team selection. The dividing line: **identity travels with the user across sports; activity is partitioned by sport**.

`getTeamInfo()` in [src/lib/teams.ts](src/lib/teams.ts) is the unified registry. `ALL_TEAMS = [...TEAMS, ...CRICKET_OPTIONS]` lets one lookup serve both. Per-sport narrowing helpers (`isFootballTeamId`, `isCricketTeamId`) gate writes — football onboarding only accepts football slugs, cricket onboarding only accepts cricket slugs. Reads are sport-agnostic; writes are not. That asymmetry is the whole point.

---

## 2. Next.js App Router: server vs client component bounds

The rule we landed on: **a route's page is a server component unless it must be client.** Most of our cricket pages are clients (`'use client'` at the top of [src/app/cricket/matches/page.tsx](src/app/cricket/matches/page.tsx) and [src/app/cricket/matches/[matchId]/page.tsx](src/app/cricket/matches/%5BmatchId%5D/page.tsx)) because they need `useSession`, polling effects, and stateful tab management. The leaderboard page is a server component shell that delegates to a client component for everything that reacts to URL changes.

**The bug worth memorising.** [src/app/leaderboard/page.tsx](src/app/leaderboard/page.tsx) was originally a server component reading `searchParams` from props to render the in-page nav. Worked on first load. Broke when the user changed sport via the SportSelector dropdown — that calls `router.replace('/leaderboard?sport=cricket', { scroll: false })`, which updates the URL but **doesn't always trigger a full RSC re-render of the same route's nav fast enough.** Result: leaderboard body refetches as cricket while the surrounding nav still shows football tabs (including a `Teams` link that teleports the user back into football).

Fix: extract the nav into [src/components/LeaderboardNav.tsx](src/components/LeaderboardNav.tsx) as a client component reading `useSearchParams()`. Client components subscribe to the routing store and re-render synchronously on URL changes. The page is now a thin server shell:

```tsx
<Suspense fallback={<nav className="mp-tabs" aria-label="Page sections" />}>
  <LeaderboardNav />
</Suspense>
```

The Suspense boundary is mandatory: in App Router, `useSearchParams` will bail out the entire tree to the nearest Suspense parent during static generation. Forget it and your build fails with an unhelpful "missing suspense boundary" error.

`export const dynamic = 'force-dynamic'` on every route hitting external live data ([src/app/api/cricket/matches/route.ts](src/app/api/cricket/matches/route.ts), `/api/leaderboard`, etc.) opts out of route-level caching. We pair it with `Cache-Control: no-store` on the response headers and `cache: 'no-store'` on the inner `fetch()`. Three layers because each disables a different cache: route segment cache, browser cache, and Next's data cache. Removing any one leaks staleness.

`revalidate` (e.g. `revalidate: 30`) was used briefly during the cricket prototype but removed once we needed truly live data. Use `revalidate` when "5–60 seconds stale" is fine. Use `cache: 'no-store'` everywhere when "live" actually means live.

---

## 3. Reverse-engineering an undocumented API

ESPN's cricket endpoint is officially "site/v2/sports/cricket/8048/…" and unofficially "we ship whatever shape we feel like today." Lessons accumulated in [src/lib/cricket/espn.ts](src/lib/cricket/espn.ts):

- **`/scoreboard` returns one event.** Just the "featured" live one. To get a fixture list, fan out across `?dates=YYYYMMDD` for every day in your window. We batch 12 parallel requests at a time to avoid socket exhaustion ([fetchMatchesForDates](src/lib/cricket/espn.ts#L283)).
- **Doubly-nested `linescores`.** Each player's `linescores[]` outer array holds entries with a `period` field; the actual `batting`/`bowling`/`statistics` payload sits inside `linescores[i].linescores[j]`. We type this explicitly as `EspnSummaryPlayerLinescore` (outer) and `EspnSummaryPlayerInnings` (inner). My first parser iterated only the outer level and silently produced empty tables.
- **Stats live in `statistics.categories[].stats[]`, not in the metadata.** The `batting` object holds dismissal info; the actual `runs`/`ballsFaced`/`strikeRate` are name/value pairs in the stats array. Detect a row's role by stat presence (`hasBattingStats(stats)`) not by `if (ls.batting)`, because newer payloads omit the metadata wrapper entirely.
- **`competitor.winner` is `"true"` (string), not `true`.** Use `String(c.winner).toLowerCase() === 'true'`. We wasted a few hours parsing "MI won by 99 runs" text before finding the structured field.
- **`status.summary` vs `status.type.detail`.** During a finished match, `summary` is the descriptive result ("MI won by 99 runs"). `detail` is just the stage label ("Final"). Originally we used `detail` and shipped "🏆 Final" as the result line. Always prefer `summary` for cricket.
- **`dismissalCard` can be the literal string "not out".** A length check (`dismissalCard.length > 0`) marks unbeaten batters as dismissed. Treat the string `"not out"` as a no-dismissal sentinel.
- **`/teams` returns `[]` for IPL.** No team directory endpoint. We harvested team ids and CDN logos by walking 90+ days of `/scoreboard?dates=` and collecting distinct competitors, then hard-coded the result in [src/lib/cricket/teams.ts](src/lib/cricket/teams.ts). My first guess at espnIds was wrong on 8 out of 10 — only MI and GT happened to match.
- **Cricket player headshots 404 even when ESPN ships them.** `https://a.espncdn.com/i/headshots/cricket/players/full/{id}.png` returns 404 in practice. Team logos at `…/teamlogos/cricket/500/{id}.png` work fine. The fix in [src/components/CricketScorecard.tsx](src/components/CricketScorecard.tsx) `PlayerAvatar` is an `onError` handler that swaps to initials silently — never let a broken-image icon ship.

The `asArray<T>` helper in [src/lib/cricket/espn.ts:87](src/lib/cricket/espn.ts#L87) is the most-used line in the file:

```ts
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
```

ESPN ships fields that are `Array<X>`, sometimes `{}`, sometimes `null`, sometimes missing. `value ?? []` doesn't help — an empty object passes the `??` test but throws when iterated. `asArray` is wrapped around every iteration point. When parsing untyped third-party data, write this helper first.

**Workflow lesson.** Schema discovery is `curl | python3 -c "import json,sys; d=json.load(sys.stdin); print(...)"` against the live endpoint, not reading docs. Every TypeScript type in `EspnSummaryPlayerInnings` was reverse-engineered from a real response. When ESPN changed its payload mid-development (the `batting`/`bowling` metadata objects became optional), we caught it because the parser was data-driven, not contract-driven.

---

## 4. Caching: TTL + in-flight dedup, picked per use case

The non-obvious bit: a TTL cache alone isn't enough. If 100 users hit `/api/cricket/standings` the moment the cache expires, all 100 would re-fan-out 121 ESPN fetches — a thundering herd. The pattern in [src/lib/cricket/espn.ts:330-347](src/lib/cricket/espn.ts#L330) and [src/lib/cricket/season-leaders.ts:361-398](src/lib/cricket/season-leaders.ts#L361) is **TTL plus in-flight dedup**:

```ts
let seasonCache: { matches: CricketMatch[]; expires: number } | null = null;
let seasonInflight: Promise<CricketMatch[]> | null = null;

export async function fetchCricketSeasonMatches() {
  if (seasonCache && seasonCache.expires > Date.now()) return seasonCache.matches;
  if (seasonInflight) return seasonInflight;
  seasonInflight = (async () => {
    try { /* fan-out, populate cache */ } finally { seasonInflight = null; }
  })();
  return seasonInflight;
}
```

Concurrent requests during a cache miss all `await` the same promise. After the first one populates the cache, subsequent calls hit the warm path. Implemented twice (season-matches and season-leaders) because they're independent but use the same shape.

**Two fetchers, one underlying helper.** `fetchCricketMatches()` uses `buildDateWindow(3, 7)` — narrow, polled by the live list page every 20s, no cache (it's already cheap). `fetchCricketSeasonMatches()` uses `buildDateWindow(90, 30)` — 121 dates, expensive, 5-min cached. Both delegate to the same `fetchMatchesForDates(dates)`. The split is because the **shape of the data needed changes by use case**: live list page needs fresh-but-narrow, standings needs slow-but-wide. Shoving them into one fetcher would have meant either polling the wide window every 20s (wasteful) or showing stale list data (wrong).

**5-min TTL choice.** Cricket matches finish ~3 hours after start; we don't need sub-minute freshness on standings. 5 minutes balances freshness against ESPN call budget. The `<button>` "refresh" pill in [CricketStandingsTable.tsx](src/components/CricketStandingsTable.tsx) lets users override the TTL — a UX answer to the developer's freshness question, instead of cranking the TTL down for the impatient minority.

**Production caveat.** The cache is a module-level `let`. On Vercel that's per-function-instance: cold starts are uncached, multiple concurrent instances each have their own cache, multi-region means each region warms independently. Acceptable for our scale; for higher traffic you'd move the cache to Redis or use Vercel's KV.

---

## 5. Database / schema: when domain expansion outgrows the schema

Original profile schema: `fan_team_id text not null` ([supabase/migrations/20260414_create_profiles.sql](supabase/migrations/20260414_create_profiles.sql#L11)). Made sense when there was one sport. When IPL cricket landed, a user signing up via `/cricket/matches` had no football team — they were picking CSK, not Liverpool. The `NOT NULL` constraint blocked that flow; the user's onboarding submit returned `null value in column "fan_team_id" of relation "profiles" violates not-null constraint`.

Fix in [supabase/migrations/20260503_relax_fan_team_id_and_add_cricket_fan_team_id.sql](supabase/migrations/20260503_relax_fan_team_id_and_add_cricket_fan_team_id.sql):

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cricket_fan_team_id text;
ALTER TABLE profiles ALTER COLUMN fan_team_id DROP NOT NULL;
```

Two principles: idempotent migrations (`IF NOT EXISTS`, repeatable `DROP NOT NULL`) so they're safe to re-run; and **drop NOT NULL when the domain expands**, don't backfill the new column with placeholder values.

**Why a separate column instead of `fan_teams JSONB { football, cricket }`.** Three reasons. (1) Existing queries against `fan_team_id` keep working unchanged. The football-only flow doesn't get rewritten. (2) Postgres indexes on text columns are cleaner than on JSONB keys; `WHERE fan_team_id = $1` stays simple and indexable. (3) Type safety in the repo layer: each column has one type, no JSON narrowing. The cost: if a fifth sport joins, this becomes "five columns" which gets ugly. JSONB would have been the right call if we knew up-front the app would carry 5+ sports. We didn't.

**Snapshot at write time.** `Message.fanTeamId` is captured when the message is sent ([src/components/CricketMatchRoom.tsx](src/components/CricketMatchRoom.tsx) `sendMessage`), not derived from the user's current profile at read time. Specifically: in cricket rooms, we send `fanTeamId: user.cricketFanTeamId ?? null`; in football rooms, `fanTeamId: user.fanTeamId`. Two consequences. (a) A user messaging in a CSK room shows CSK flair, not their Liverpool flair — even though both are on their profile. (b) Historical messages survive future fan-team changes; if the user moves from MI to CSK next season, their old MI-room messages still display MI flair. Identity-at-write-time is almost always the right answer for activity records.

**Founding-fan tier algorithm.** In [src/lib/profile-repo.ts](src/lib/profile-repo.ts) `getLeaderboardProfiles`, we compute the top-5 / top-25 / top-75 earliest signups per team (gold / silver / bronze), recomputed at read time. No tier column on `profiles`. The cricket leaderboard mode buckets by `cricket_fan_team_id` instead of `fan_team_id` — same algorithm, different column. The cost is a per-request scan; the saving is no migration when the cutoffs change.

---

## 6. Realtime + chat

Pusher channel naming is `match-${matchId}` ([src/components/CricketMatchRoom.tsx](src/components/CricketMatchRoom.tsx) `channel = pusherRef.current.subscribe(\`match-${match.id}\`)`). Because cricket match ids carry the `cricket-` prefix, the resulting Pusher channels — `match-cricket-1529287` for cricket, `match-705891` for football — are guaranteed-disjoint without any explicit cross-sport guard. Naming did the work that a `WHERE sport = …` filter would otherwise have.

**Polling cadence by state**: `match.status === 'live' ? 15_000 : 60_000` ([CricketMatchRoom.tsx](src/components/CricketMatchRoom.tsx) match-detail polling effect). 15s is roughly the time between ESPN refreshing a live scoreboard. 60s for upcoming/finished is "noticeable but not wasteful" for state that barely changes. Don't poll uniformly; poll based on what the user is looking at.

**Realtime config fallback chain**, in priority order: env var (`NEXT_PUBLIC_PUSHER_KEY`) → `/api/pusher-config` API → silently disabled. The third tier matters: when realtime is unavailable, we don't surface an error; we just degrade to polling-only. Chat still works because `sendMessage` calls `upsertMessage(msg)` immediately after the POST returns, regardless of whether the broadcast succeeds. The sender always sees their own message.

This local-echo pattern is worth highlighting as its own lesson. In a chat system, the optimistic path and the realtime path can both fire — and they should. If the broadcast lands first you do nothing extra; if the local echo lands first the broadcast becomes a no-op via the dedup in `upsertMessage`. Build for both, dedup at receive.

---

## 7. URL as source of truth

Two patterns in the codebase, both deliberate.

**Sport state on the leaderboard** lives in `?sport=`, not local state. [LeaderboardClient.tsx](src/components/LeaderboardClient.tsx) reads it via `useSearchParams()` on mount and via a `useEffect` that re-reads whenever `searchParams` changes. The SportSelector dropdown writes it via `router.replace(..., { scroll: false })`. Result: the URL is shareable, the back button works, and any nav anywhere in the app can deep-link with confidence.

```ts
useEffect(() => {
  const fromUrl = readSportParam(searchParams.get('sport'));
  if (fromUrl !== sport) setSport(fromUrl);
}, [searchParams, sport]);
```

**Tab state on the cricket matches page** uses the same pattern with `?tab=`. Critical for the leaderboard nav — its `Table` link points at `/cricket/matches?tab=table`, and the page reads that on mount. Without URL state, deep linking would land on the Matches tab and force the user to click Table.

**Where we don't use URL state.** The cricket fan-team-picker dismissal ("Maybe later" → don't show again this session) lives in component state, not URL or localStorage. Reasoning: it's session-only by design (we want to re-prompt next visit), it's not shareable, and putting it in the URL would clutter every cricket-room link. The rule: URL state for things users would want to bookmark or share; ephemeral state for everything else.

---

## 8. CSS specificity and layout

The bug we hit twice: `.cksl-table td { text-align: right }` (specificity `0,1,1`) silently beats `.cksl-col-name { text-align: left }` (specificity `0,1,0`). Two-class selectors win over one-class selectors. The visible symptom in [CricketSeasonLeaders.tsx](src/components/CricketSeasonLeaders.tsx) was that the team abbreviation under each player's name appeared right-aligned, jutting out to the cell's right edge instead of stacking flush-left under the player name.

Two valid fixes, both used in this codebase:

```css
/* Option 1: brute-force with !important — fine for cell-level overrides in tables */
.cksl-col-name { text-align: left !important; min-width: 200px; }

/* Option 2: increase specificity properly */
.cksl-table td.cksl-col-name { text-align: left; }
```

We mostly used `!important`. The defense: in a stat table, the column-level alignment override is an unambiguous intent (it should never lose to a generic cell rule), and the `!important` is contained to one ruleset. The case against `!important` — cascading override hell — applies to global utility classes, not to scoped table column rules.

**Team color as a CSS variable**, set inline per row:

```tsx
<tr style={{ '--team-color': row.team.color || '#334779' } as React.CSSProperties}>
```

Then CSS rules read it: `background: color-mix(in srgb, var(--team-color, var(--accent-blue)) 12%, transparent)`. One CSS rule responds to every team's brand color without writing 20 selectors. The `color-mix()` function (recent CSS) is doing the work of a Sass mixin without the build step. See [CricketStandingsTable.css](src/components/CricketStandingsTable.css), [CricketMatchList.css](src/components/CricketMatchList.css), and [CricketVotePicker.css](src/components/CricketVotePicker.css) for the pattern.

**Mobile column hiding** via dedicated class:

```css
@media (max-width: 560px) {
  .cks-col-hide-sm { display: none; }
}
```

Cleaner than nth-child math because the markup self-documents which columns are non-essential. T (tied) and NR (no-result) hide on mobile; P, W, L, NRR, Pts stay.

`font-variant-numeric: tabular-nums` on stat cells. Without it, "433" is narrower than "414" because `4` and `3` have different widths in proportional fonts; columns visibly wobble. With it, all digits get the same advance width; numeric columns align rigidly. Free fix for any data table.

The CSS variable theme system in [src/app/globals.css](src/app/globals.css) is worth scanning. Light/dark themes share the same ruleset; only the `--neutral-rgb`, `--bg-card`, etc. swap inside `@media (prefers-color-scheme: dark)`. `color-mix(in srgb, var(--accent-blue) 12%, transparent)` then produces the right tint in either theme.

---

## 9. The git rebase recovery

Scenario: feature branch had three commits — initial cricket scaffold, design improvements, stale-score fix. Default branch advanced; we rebased onto a newer base that already had the cricket feature merged via PR. Result: 11 files in "both added" state because HEAD already had everything the old commits introduced.

The right move was `git checkout --ours <files>` for every conflicted source file. `--ours` in a rebase context means the rebase target (the new base + already-applied earlier commits), not the commits being replayed. We took HEAD's content for every conflict because HEAD already had the full feature. After staging, the first commit became empty (no diff), git noticed, the second commit was auto-dropped as "patch contents already upstream," and the third (the stale-score fix) applied cleanly.

Two takeaways.

**Empty replayed commits in rebase.** Git silently drops a commit if its diff against the new parent is empty. You'll see `dropping <hash> <message> -- patch contents already upstream`. You don't have to `git rebase --skip` manually unless git can't determine emptiness automatically.

**Force-push hygiene.** `git push --force-with-lease origin <branch>` is what you want, not `--force`. `--force-with-lease` checks the remote's tip before clobbering: if a teammate has pushed in the meantime, the push fails and you discover it before destroying their work. Plain `--force` doesn't check.

---

## 10. Backwards compat: the workaround that survives just long enough

When cricket banter first launched, users' chat messages carried their football fan team via `Message.fanTeamId`. So a Liverpool fan messaging in a CSK match room saw a Liverpool flair under their username — wrong sport. Quick fix: a `hideTeamFlair?: boolean` prop on [ChatPanel.tsx](src/components/ChatPanel.tsx) that just stopped rendering the team row when set. We passed `hideTeamFlair` from the cricket banter ChatPanel.

Lived for a few iterations. Then the proper fix landed: per-sport fan team in the user model (`cricketFanTeamId`), and the cricket room's `sendMessage` started writing `fanTeamId: user.cricketFanTeamId` so the message itself carried a cricket team, not a football one. The flair rendering became correct without any conditional. The `hideTeamFlair` prop was deleted in the same commit that wired up the proper fix.

The principle: **a workaround should be designed to die.** Make it small, ugly enough to draw attention, with a one-line removal once the proper fix lands. Don't smooth out the workaround so much that it becomes the de-facto API.

**Type-narrowing without forking.** `VoteChoice = 'home' | 'draw' | 'away'` was inherited from football, where draws happen. Cricket has no draws — but instead of forking into `VoteChoice = 'home' | 'away'` and updating ~12 files, we kept the union and added one branch in the cricket vote picker:

```ts
const castVote = useCallback(async (vote: VoteChoice): Promise<void> => {
  if (vote === 'draw') return;  // cricket: no draws
  // ... POST as normal
}, []);
```

Plus the cricket vote UI never renders a draw button. `VoteTally.draw` stays at 0 in cricket. Forking would have been clean but expensive; one runtime check kept the existing infrastructure. The trade is: the type system says the cricket vote can be a draw (it can't), but no caller can produce one. Type fork only when callers can demonstrably create the wrong thing; otherwise eat the asymmetry.

---

## 11. TypeScript notes

**Discriminated `Sport`** at [src/lib/teams.ts](src/lib/teams.ts):

```ts
export type Sport = 'football' | 'cricket';
export function getFanTeamForSport(
  user: { fanTeamId?: TeamId | null; cricketFanTeamId?: TeamId | null },
  sport: Sport,
): TeamId | null { /* … */ }
```

Functions parameterised on `Sport` get exhaustiveness checking. Add a third sport, every call site lights up.

**Per-sport types not a union.** Cricket has its own `CricketMatch` in [src/lib/cricket/types.ts](src/lib/cricket/types.ts), distinct from football's `Match`. The shapes are different (innings vs goals, overs vs minutes, no formations, etc.). The temptation was a discriminated union `type Match = FootballMatch | CricketMatch` but that would force every consumer to check the discriminator, even consumers that only ever see one sport. Splitting into two types and routing them through different code paths is the right answer.

**Type guards as routing helpers.** `isCricketMatchId(id)` (literally `id.startsWith('cricket-')`) is a one-line predicate, but at every call site it tells TypeScript and the reader exactly what's about to happen — "this branch handles cricket." Same for `isFootballTeamId`/`isCricketTeamId` in profile validation:

```ts
if (fanTeamIdRaw && !isFootballTeamId(fanTeamIdRaw)) {
  return { error: 'Invalid football team selection' };
}
if (cricketFanTeamIdRaw && !isCricketTeamId(cricketFanTeamIdRaw)) {
  return { error: 'Invalid cricket team selection' };
}
```

Two predicates, two error messages, no cross-bleed. A single `isValidTeamId` helper would have accepted IPL slugs as football teams and vice versa.

---

## 12. Debugging discipline

**Verify the data before tweaking the UI.** Three separate user reports — "table looks off," "design is off," "names are wrong" — all turned out to be data layer bugs, not styling bugs. The fixes were a wider date window, an updated competitor.winner field path, and a parser that read from `statistics.categories[].stats[]` instead of metadata. CSS got changed too, but the visible UX wins came from the data.

The reflex to develop: when a UI looks wrong, run the data through the parser end-to-end first. If the underlying numbers are wrong, the UI is downstream of a real bug. If the numbers are right and the UI is misaligned, *then* it's CSS.

**Throwaway probe scripts.** Every new ESPN endpoint started with a 30-line `node /tmp/test-x.mjs` that called the live URL and printed parsed output. The full standings rebuild started with one of these dumping a manually-computed points table from raw scoreboard data, which matched cricinfo's published table — proof the algorithm was right before any TypeScript was written. Keep these in `/tmp/` so they don't pollute the repo, but write them.

**Don't trust an earlier probe.** ESPN changed payload shape at least twice during this work. The `batting` and `bowling` metadata objects became optional mid-development. The first time we discovered this was when the Stats tab silently rendered empty after working perfectly the day before. Re-probe live data when something stops working, even if you "know" the schema.

**Cache suspicion vs reality.** When the standings showed 0 wins for everyone after a fix, the gut reaction was "stale Next.js cache." We had `dynamic = 'force-dynamic'`, `Cache-Control: no-store`, and `cache: 'no-store'` on the inner fetch — three layers, all uncached. The bug was in the parser (winner detection text-matching the wrong field). If you have triple-uncached endpoints and the data is wrong, the bug is in your code. Don't blame caches that are demonstrably disabled.

---

## Interview talking points

10 capsules to keep in your head. Each is one specific lesson, recallable in a 45-min interview under pressure.

1. **Generalising one-sport-to-N**: namespace the entity that gets stored (matchId prefix) so chat/votes partition automatically. Identity stays sport-agnostic; activity is partitioned by ID prefix, not by query filters.

2. **Server vs client component split for URL-reactive UI**: server components reading `searchParams` from props don't always re-render fast enough on client-side `router.replace`. Extract the part that needs to react into a client component using `useSearchParams`, wrap in `<Suspense>`.

3. **Three layers to disable caching on a truly-live endpoint**: `dynamic = 'force-dynamic'` (route segment cache), `Cache-Control: no-store` on response (browser cache), `cache: 'no-store'` on the inner `fetch()` (Next data cache). Skip any one and staleness leaks.

4. **TTL caches need in-flight dedup or you'll thunder-herd**: `let cache` plus `let inflight: Promise | null` so concurrent requests during a cache miss share the same promise. Without it, 100 simultaneous misses kick off 100 expensive operations.

5. **Two fetchers, one underlying helper**: `fetchCricketMatches()` (narrow, frequent, uncached) and `fetchCricketSeasonMatches()` (wide, infrequent, 5-min cached) both delegate to `fetchMatchesForDates(dates)`. The shape of the data needed should drive the cache strategy, not vice versa.

6. **Snapshot identity at write time**: `Message.fanTeamId` is captured per message based on the room's sport, not derived from the user's current profile at read. Old messages survive future profile changes. The pattern generalises to any "activity carries denormalised actor state" decision.

7. **Drop NOT NULL when domain expands**: original schema had `fan_team_id NOT NULL` because there was one sport. When cricket landed, cricket-only users couldn't onboard. Migration: `ALTER COLUMN fan_team_id DROP NOT NULL`. Idempotent, repeatable, doesn't backfill placeholders.

8. **`!important` is fine for table cell overrides** because the column-level alignment intent is unambiguous and the override scope is bounded. The case against `!important` applies to global utility classes, not to scoped column rules in stat tables.

9. **Channel naming as cross-sport partitioning**: `match-${matchId}` Pusher channels with cricket matchIds prefixed `cricket-` are automatically disjoint from football channels. Naming did the work of an explicit `WHERE sport = …` filter.

10. **`asArray<T>(value)` is the most-used line when parsing third-party JSON**. ESPN sometimes ships arrays as `{}` or `null`. Wrap every iteration. The variation `value ?? []` doesn't help — `{}` is truthy.

11. **URL state for shareable, ephemeral state for session-only**: `?sport=cricket` in the URL because users would deep-link cricket leaderboards; the cricket-fan-team-picker dismissal in component state because re-prompting next session is the desired behaviour.

12. **Workarounds should be designed to die**: the `hideTeamFlair` prop on ChatPanel was an explicit, ugly band-aid that survived three iterations until the proper per-sport fanTeamId plumbing landed, then got deleted in a single commit. A workaround that's smoothed out becomes the de-facto API.
