# Mobile standings table visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On small screens, show Premier League standings as stacked cards so **all fields are visible by default**, while keeping the existing table for `>=600px`.

**Architecture:** `LeagueHub` will render two presentations from the same `standings` array: a mobile-only card list and the existing table. CSS media queries will toggle visibility at `600px`.

**Tech Stack:** Next.js App Router, React, CSS modules via component stylesheet (`src/components/LeagueHub.css`).

---

## File structure

- Modify: `src/components/LeagueHub.tsx`
  - Add `StandingsCards` mobile renderer (cards + stats grid + next fixture row).
  - Keep existing `StandingsTable` unchanged for desktop/tablet.
  - Render both, with breakpoint-controlled containers.
- Modify: `src/components/LeagueHub.css`
  - Add styles for `.lh-cards` layout and card elements.
  - Add breakpoint rules to show cards `<600px` and table `>=600px`.

---

### Task 1: Add mobile standings cards renderer

**Files:**
- Modify: `src/components/LeagueHub.tsx`

- [ ] **Step 1: Identify the standings shape used by the table**
  - Open `src/components/LeagueHub.tsx` and confirm fields referenced today:
    - `position`, `note`, `logo`, `teamShortName`
    - `played`, `wins`, `draws`, `losses`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points`
    - `nextMatch` shape: `isHome`, `opponent`, `opponentLogo`, `date`

- [ ] **Step 2: Create `StandingsCards` component**
  - Add a component alongside `StandingsTable`:
    - Map `standings` into a list of cards.
    - Card header: position + note dot + logo + team short name.
    - Stats grid: render label/value pairs for `P, W, D, L, GF, GA, GD, Pts` (all present, no hiding).
    - Next row: render opponent + date (use existing `formatDate`), fallback `-`.
    - Apply the same GD color logic currently used in the table.

- [ ] **Step 3: Render both card list and table**
  - Wrap them in containers:
    - `<div className="lh-cards-wrap">…cards…</div>`
    - Existing `<div className="lh-table-wrap">…table…</div>` remains
  - Ensure both render from the same `standings` array.

- [ ] **Step 4: Manual verify (dev server)**
  - Run: `npm run dev`
  - Visit: `/matches?tab=table`
  - In responsive mode:
    - At `390px` width, confirm cards appear and show all fields by default.
    - At `600px` and above, confirm the existing table appears.

---

### Task 2: Add mobile card CSS + breakpoint toggles

**Files:**
- Modify: `src/components/LeagueHub.css`

- [ ] **Step 1: Add base styles for cards**
  - Add styles for:
    - `.lh-cards-wrap` container spacing
    - `.lh-card` (border, background, padding, radius)
    - `.lh-card-head` (align position/logo/name)
    - `.lh-card-stats` as compact grid (3 columns default; can drop to 2 columns at very small widths)
    - `.lh-stat` (label + value)
    - `.lh-card-next` row (next fixture)
  - Ensure typography remains readable at `320px`.

- [ ] **Step 2: Add breakpoint visibility rules**
  - Default (`<600px`):
    - Show `.lh-cards-wrap`
    - Hide `.lh-table-wrap`
  - At `@media (min-width: 600px)`:
    - Hide `.lh-cards-wrap`
    - Show `.lh-table-wrap`

- [ ] **Step 3: Manual verify (edge sizes)**
  - At `320px` width:
    - Confirm no fields wrap into unreadable overflow (labels stay visible).
  - At `428px` width:
    - Confirm spacing looks consistent.
  - At `>=600px`:
    - Confirm table identical to before.

---

### Task 3: Quality gate (lint + quick regression)

**Files:**
- Modify: `src/components/LeagueHub.tsx`
- Modify: `src/components/LeagueHub.css`

- [ ] **Step 1: Run lint**
  - Run: `npm run lint`
  - Expected: no new lint errors.

- [ ] **Step 2: Quick regression checks**
  - Confirm `/matches` still loads and tab switching still works.
  - Confirm no console errors in browser devtools on `/matches?tab=table`.

