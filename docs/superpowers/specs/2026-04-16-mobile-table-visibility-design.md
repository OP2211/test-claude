# Mobile standings table visibility on small screens

## Problem
In mobile view, the standings table in `LeagueHub` does not show all data clearly. Some fields are hidden at small breakpoints, so users cannot see complete team stats by default.

## Goal
- On small screens, all standings fields are visible by default (no hidden stats).
- Keep desktop/tablet table behavior unchanged.
- Preserve existing data source and sorting.

## Non-goals
- No API changes.
- No changes to standings logic or ranking calculations.
- No expand/collapse interactions for hidden fields.

## Chosen approach
Use a dedicated mobile presentation:
- Below `600px`, render standings as stacked cards (one team per card).
- Keep the existing table for `>=600px`.

## Mobile card design
- **Header row**: position, note indicator (if present), logo, team short name.
- **Stats grid**: always-visible fields: `P`, `W`, `D`, `L`, `GF`, `GA`, `GD`, `Pts`.
- **Next fixture row**: always visible; show `vs/@ opponent + date`, fallback `-` when missing.
- **Visual emphasis**:
  - `Pts` highlighted as primary value.
  - `GD` keeps positive/negative color treatment.

## Implementation details
- Update `src/components/LeagueHub.tsx`:
  - Add a new mobile standings renderer component that maps existing `standings` data into cards.
  - Keep existing `StandingsTable` for desktop.
  - Render both containers with CSS-controlled visibility by breakpoint.
- Update `src/components/LeagueHub.css`:
  - Add styles for mobile cards and stats grid.
  - Add breakpoint rules:
    - `<600px`: show cards, hide table wrapper.
    - `>=600px`: show table wrapper, hide cards.

## Risks and mitigations
- **Risk:** Visual density on very narrow devices.
  - **Mitigation:** Use compact 2- or 3-column stat grid with clear labels and strong spacing.
- **Risk:** Drift between mobile and desktop fields over time.
  - **Mitigation:** Build both layouts from the same `standings` shape and keep field list explicit in one place.

## Test plan
- Mobile widths (`320px`, `375px`, `390px`, `428px`):
  - Confirm all fields are visible for each team card by default.
  - Confirm next fixture is visible or `-` fallback.
- Tablet/Desktop (`>=600px`):
  - Confirm existing table renders exactly as before.
- Data states:
  - Teams with/without note indicator.
  - Teams with positive, zero, and negative GD.
  - Teams with/without `nextMatch`.
