# Always-On Demo Match (Remove `demo` query param)

## Problem
Demo match behavior is currently controlled by a `demo` query parameter (`?demo=1`, plus legacy `true/yes`) that is parsed and propagated across UI routes and API handlers. This creates unnecessary URL coupling and branching for a behavior that should always be on.

## Goals / success criteria
- Demo match is always available in the matches list.
- Demo match detail loads without requiring any query parameter.
- No frontend or API code parses or propagates a `demo` query parameter.
- Existing room behavior (polling, roster handling, seed messages) remains unchanged.

## Non-goals
- Introducing a new runtime/config toggle for demo behavior.
- Redesigning demo match content (teams, scoreline, kickoff, etc.).
- Refactoring unrelated match, auth, or messaging logic.

## Current state (relevant)
- Frontend pages and room component read `demo` from URL/search params and append it to API requests.
- API routes `/api/matches` and `/api/match` parse `demo` and map it to `includeDemo`.
- Data layer (`getMatches`, `getMatch`) conditionally includes/resolves demo via `includeDemo`.
- Store message seeding uses `getMatch(matchId, { includeDemo: matchId === DEMO_MATCH_ID })`.

## Chosen approach (A)
Hard-remove `demo` as a URL/API concept and make demo behavior unconditional:

- Remove all `demo` query parsing/forwarding in frontend.
- Remove all `demo` query parsing in API handlers.
- Make data APIs always include the demo match and always resolve `DEMO_MATCH_ID`.

This keeps behavior simple and consistent: demo is a first-class match, not a mode.

## Implementation outline

### 1) Data layer: always include/resolve demo
- `src/lib/data.ts`
  - Change `getMatches(options?: { includeDemo?: boolean })` to `getMatches()` and always prepend `buildDemoLiveMatch(...)` to the current source list (cache, ESPN, or fallback path).
  - Change `getMatch(id, options?: { includeDemo?: boolean })` to `getMatch(id)` and always return a generated demo match when `id === DEMO_MATCH_ID`.
  - Update inline comments/docstrings to remove `?demo=1` references.

### 2) API: remove demo query handling
- `src/app/api/matches/route.ts`
  - Remove `demo` parsing and `includeDemo` option passing.
  - Return `getMatches()` directly.
- `src/app/api/match/route.ts`
  - Remove `demo` parsing and `includeDemo` option passing.
  - Return `getMatch(id || '')` directly.

### 3) Frontend: remove demo URL plumbing
- `src/app/matches/page.tsx`
  - Remove `demoParam`/`demoQs` and associated dependencies.
  - Fetch `/api/matches` unconditionally.
  - Route to `/matches/${match.id}` without query propagation.
- `src/app/matches/[matchId]/page.tsx`
  - Remove search-param reads related to demo.
  - Fetch `/api/match?id=${matchId}` directly.
  - Navigate back to `/matches` without query propagation.
- `src/components/MatchRoom.tsx`
  - Remove `window.location.search` demo parsing.
  - Fetch `/api/match?id=${match.id}` in initial load and polling.
  - Remove `demoParam` from effect dependencies.

### 4) Store call-site alignment
- `src/lib/store.ts`
  - Update `getMatch(matchId, { includeDemo: matchId === DEMO_MATCH_ID })` call to `getMatch(matchId)`.

## Risks and mitigations
- **Risk:** Existing deep links containing `?demo=1` may still circulate.
  - **Mitigation:** Ignoring unknown query params keeps these links harmless; behavior is now always on.
- **Risk:** Type/signature mismatches from removing optional params.
  - **Mitigation:** Update all compile-time call sites and run lint/type checks.

## Test plan
- Open `/matches` and confirm demo card is present without query params.
- Open `/matches/<demo-match-id>` and verify room loads and polls successfully.
- Open any non-demo match and verify details/room still load normally.
- Confirm `/api/matches` includes demo entry with no query.
- Confirm `/api/match?id=demo-live-match` returns demo match with no query.
- Smoke-check message seed path still works for demo and non-demo match ids.
