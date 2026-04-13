# Landing Page Icon + UX Refresh Design (Pulse Matchday)

## Goal

Refresh the landing page with a sporty, energetic fan vibe while preserving the existing information architecture and content density.

## Scope

### In scope

- Landing page visual polish in `src/components/LandingHome.tsx` and `src/components/LandingHome.css`.
- Add sporty/dynamic inline SVG icons for:
  - social-proof stat strip items,
  - feature section titles,
  - primary/secondary CTA buttons.
- Improve interaction feel with subtle motion cues:
  - icon nudge on CTA hover/focus,
  - stat/feature icon micro-pop,
  - refined live pulse behavior,
  - polished sticky CTA hover/focus.
- Improve visual hierarchy through spacing, contrast, and grouping adjustments (without changing section order).
- Preserve accessibility:
  - maintain color contrast,
  - visible focus states,
  - `prefers-reduced-motion` fallback.

### Out of scope

- Removing duplicated sections (including waitlist duplication) in this pass.
- Reordering page sections.
- Copy rewrite beyond small CTA/icon-adjacent text adjustments.
- Route, data, or API behavior changes.

## Constraints

- Keep all existing section blocks present in the page.
- Keep current CTA destinations and anchor behavior (`onEnterFanGround`, `onSeeLiveRooms`, `#waitlist` link usage).
- Do not introduce external icon dependencies for this pass; use inline SVGs to stay lightweight and style-consistent.

## Design Direction

### Visual style

- Sporty outline icon language with energetic stroke angles and compact geometry.
- Motion should feel lively but restrained, avoiding visual noise.
- Emphasis on "matchday pulse" cues over heavy effects.

### UX behavior intent

- Make CTA affordances feel more immediate and clickable.
- Improve scanability of key value props using icon + text pairings.
- Keep existing narrative flow, but make each section easier to parse quickly.

## Component-level Plan

### `LandingHome.tsx`

- Add a small internal icon helper set (typed React functions/components) for reuse.
- Replace emoji stat markers with inline SVG icon elements.
- Add icons before relevant CTA labels.
- Add icons next to feature titles in "The experience" section.
- Preserve all existing sections, including repeated waitlist/CTA placements.

### `LandingHome.css`

- Add icon wrapper and sizing tokens for consistent rendering.
- Add transition and transform rules for CTA/icon interactions.
- Add subtle hover/focus motion for stat and feature items.
- Refine sticky CTA visual treatment (elevation/feedback), keeping current behavior.
- Add reduced-motion overrides for all new animations.

## Accessibility & Quality

- Use `aria-hidden="true"` for decorative icons and keep text labels intact.
- Ensure keyboard users receive equal hover-state cues through `:focus-visible`.
- Keep animation durations short and non-blocking.
- Respect user motion preferences with `@media (prefers-reduced-motion: reduce)`.

## Testing Plan

- Manual visual checks:
  - desktop and mobile layouts,
  - hover/focus states on CTA/stat/feature elements,
  - sticky CTA behavior and readability.
- Accessibility checks:
  - keyboard navigation on interactive elements,
  - reduced motion mode behavior,
  - contrast spot-check for icon + text combinations.
- Regression checks:
  - all CTA actions still call existing handlers correctly,
  - section order and waitlist placement remain unchanged.

## Risks and Mitigations

- Risk: Motion feels too busy.
  - Mitigation: Use low-amplitude transforms and short durations; disable for reduced-motion users.
- Risk: Icon style inconsistency across sections.
  - Mitigation: Centralize icon style via shared wrappers/strokes in component and CSS tokens.
- Risk: Sticky CTA visual changes reduce legibility in some themes.
  - Mitigation: Validate in light/dark theme contexts and keep strong text/background contrast.

## Acceptance Criteria

- Landing page presents a noticeably more energetic/sporty feel.
- Stats, feature titles, and key CTAs include consistent sporty icons.
- Interaction polish is visible but subtle, with no layout regressions.
- All existing sections remain in place (no noise-reduction/removal changes).
- Accessibility standards for focus visibility and reduced motion are maintained.
