# Landing Icons + UX Pulse Matchday Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sporty, energetic icons and subtle interaction polish to the landing page without removing existing sections or changing flow.

**Architecture:** Keep all work localized to `LandingHome` markup and stylesheet. Introduce small reusable icon components in TSX and hook them into existing stat/feature/CTA nodes, then layer CSS transitions/motion tokens that preserve accessibility and reduced-motion behavior.

**Tech Stack:** Next.js App Router, React TSX, CSS modules/global component stylesheet, existing design tokens.

---

## File Structure

- Modify: `src/components/LandingHome.tsx`
  - Add typed inline SVG icon helpers.
  - Replace emoji stat icons with decorative SVG.
  - Add CTA-leading icons and feature-title icons.
- Modify: `src/components/LandingHome.css`
  - Add icon utility classes.
  - Add hover/focus micro-animations for CTA/stat/feature.
  - Add sticky CTA polish and reduced-motion coverage.
- Verify: `npm run lint`

### Task 1: Add Landing Icon Components

**Files:**
- Modify: `src/components/LandingHome.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Write the failing test (lint/type signal for new symbols)**

```tsx
// Intentionally reference icon components before defining them in the file:
<span className="landing-icon" aria-hidden="true">
  <SecondScreenIcon />
</span>
```

- [ ] **Step 2: Run check to verify failure**

Run: `npm run lint`
Expected: FAIL with `SecondScreenIcon is not defined` (and similar for other new icons).

- [ ] **Step 3: Write minimal implementation**

```tsx
function SecondScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="9" y1="17" x2="15" y2="17" />
      <circle cx="12" cy="7.5" r="1.5" />
    </svg>
  );
}
```

- [ ] **Step 4: Run check to verify pass**

Run: `npm run lint`
Expected: PASS for undefined symbol errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingHome.tsx
git commit -m "feat: add reusable sporty landing icons"
```

### Task 2: Wire Icons Into Stats, Features, and CTAs

**Files:**
- Modify: `src/components/LandingHome.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Write failing test/signal**

```tsx
// Replace emoji usage; before replacement these icon wrappers won't exist:
<span className="landing-stat-icon" aria-hidden="true">
  <SecondScreenIcon />
</span>
```

- [ ] **Step 2: Run check to verify failure**

Run: `npm run lint`
Expected: FAIL while JSX references new structure not yet fully wired/import-safe.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div className="landing-stat">
  <span className="landing-stat-icon" aria-hidden="true"><SecondScreenIcon /></span>
  <span>90%+ fans use second screen</span>
</div>
<button type="button" className="landing-btn landing-btn--primary" onClick={onEnterFanGround}>
  <span className="landing-btn-icon" aria-hidden="true"><StadiumArrowIcon /></span>
  Enter FanGround
</button>
<h3 className="landing-feature-title">
  <span className="landing-feature-title-icon" aria-hidden="true"><ShieldFanIcon /></span>
  Fan identity
</h3>
```

- [ ] **Step 4: Run check to verify pass**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingHome.tsx
git commit -m "feat: apply icons across landing stats features and ctas"
```

### Task 3: Add Motion and Interaction Polish

**Files:**
- Modify: `src/components/LandingHome.css`
- Test: `npm run lint`

- [ ] **Step 1: Write failing check**

```css
/* Add class usage in TSX first; lint/style check should flag if malformed CSS is added during iteration. */
.landing-btn-icon { }
```

- [ ] **Step 2: Run check to verify failure**

Run: `npm run lint`
Expected: FAIL if CSS/TSX class references are incomplete or syntax errors are introduced.

- [ ] **Step 3: Write minimal implementation**

```css
.landing-btn {
  gap: 10px;
}

.landing-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

.landing-btn:hover .landing-btn-icon,
.landing-btn:focus-visible .landing-btn-icon {
  transform: translateX(3px) rotate(-4deg);
}

.landing-stat-icon,
.landing-feature-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out), color var(--duration-fast);
}

.landing-stat:hover .landing-stat-icon,
.landing-feature:hover .landing-feature-title-icon {
  transform: translateY(-1px) scale(1.06);
}

@media (prefers-reduced-motion: reduce) {
  .landing-btn-icon,
  .landing-stat-icon,
  .landing-feature-title-icon {
    transition: none;
    transform: none;
  }
}
```

- [ ] **Step 4: Run check to verify pass**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingHome.css
git commit -m "feat: add energetic motion polish for landing interactions"
```

### Task 4: Verify Sticky CTA and Regression Safety

**Files:**
- Modify: `src/components/LandingHome.css` (if needed)
- Test: `npm run lint`

- [ ] **Step 1: Write failing signal**

```css
/* Introduce only if visual QA requires adjustment; begin with current sticky CTA rules. */
```

- [ ] **Step 2: Run verification baseline**

Run: `npm run lint`
Expected: PASS baseline before refinements.

- [ ] **Step 3: Write minimal implementation (if needed after visual QA)**

```css
.landing-sticky .landing-btn {
  box-shadow: var(--shadow-3), 0 10px 28px color-mix(in srgb, var(--accent-yellow) 22%, transparent);
}

.landing-sticky .landing-btn:hover,
.landing-sticky .landing-btn:focus-visible {
  transform: translateY(-1px);
}
```

- [ ] **Step 4: Run full verification**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingHome.css src/components/LandingHome.tsx
git commit -m "fix: finalize landing sticky cta polish and regressions"
```

## Final Verification Checklist

- [ ] Run `npm run lint` and confirm zero new errors.
- [ ] Visual QA on mobile + desktop for:
  - stat strip icons,
  - feature title icons,
  - CTA button icons/motion,
  - sticky CTA feedback.
- [ ] Confirm all existing sections still present (including duplicate waitlist placement).
- [ ] Confirm reduced motion disables new micro-animations.
