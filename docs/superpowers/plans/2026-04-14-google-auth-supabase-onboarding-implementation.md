# Google Auth Supabase Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate match-room access behind Google sign-in plus required profile onboarding persisted in Supabase.

**Architecture:** Extend NextAuth session to include Google `sub`, add server-side profile APIs backed by Supabase `profiles`, and update onboarding UI/page state flow to fetch and enforce completion before room entry. Keep existing team-selection popup visuals and hardcoded teams.

**Tech Stack:** Next.js App Router, NextAuth, Supabase JS, TypeScript, Next API routes.

---

### Task 1: Add shared teams and Supabase profile data access

**Files:**
- Create: `src/lib/teams.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/profile-repo.ts`
- Test: `npm run lint`

- [ ] Define hardcoded teams once in `src/lib/teams.ts` and export team IDs + validator.
- [ ] Add Supabase client factory in `src/lib/supabase.ts` using env vars.
- [ ] Add profile repository in `src/lib/profile-repo.ts`:
  - lookup by `google_sub`
  - username availability check (case-insensitive)
  - upsert profile by `google_sub`
- [ ] Run `npm run lint` and fix errors.

### Task 2: Extend auth session with Google subject

**Files:**
- Modify: `src/lib/auth-options.ts`
- Create: `src/types/next-auth.d.ts`
- Test: `npm run lint`

- [ ] Add NextAuth callbacks to persist provider account id (`sub`) into JWT.
- [ ] Expose `googleSub` on `session.user`.
- [ ] Add module augmentation types for NextAuth JWT/session.
- [ ] Run `npm run lint` and fix errors.

### Task 3: Add profile APIs with validation and onboarding completeness

**Files:**
- Create: `src/lib/profile-validation.ts`
- Create: `src/app/api/profile/me/route.ts`
- Create: `src/app/api/profile/upsert/route.ts`
- Test: `npm run lint`

- [ ] Add server validators for `username`, `phone`, `fanTeamId`, `dob`, `city`.
- [ ] Implement `GET /api/profile/me` to return profile and `isOnboardingComplete`.
- [ ] Implement `POST /api/profile/upsert` to validate, enforce unique username, and upsert.
- [ ] Ensure API derives identity from authenticated session, not request body.
- [ ] Run `npm run lint` and fix errors.

### Task 4: Update onboarding modal to collect and submit profile details

**Files:**
- Modify: `src/components/OnboardingModal.tsx`
- Modify: `src/components/OnboardingModal.css` (if needed)
- Test: `npm run lint`

- [ ] Keep current team picker popup UI, add required `username` and `phone` inputs plus optional `dob`, `city`.
- [ ] Submit profile payload via callback (`onComplete`) only after local validation.
- [ ] Surface field/global errors for failed submission.
- [ ] Run `npm run lint` and fix errors.

### Task 5: Gate room access in home page using profile completeness

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/lib/types.ts`
- Test: `npm run lint`

- [ ] Fetch profile on authenticated session and map into app `User` state.
- [ ] If incomplete profile, open onboarding before allowing room join.
- [ ] Save profile through API on onboarding completion, then continue pending room navigation.
- [ ] Preserve existing sign-out and pending match behavior.
- [ ] Run `npm run lint` and fix errors.

### Task 6: Add database migration script for Supabase profiles table

**Files:**
- Create: `supabase/migrations/20260414_create_profiles.sql`
- Test: manual SQL review

- [ ] Create SQL for `profiles` table and indexes:
  - unique `google_sub`
  - unique `lower(username)` for case-insensitive username uniqueness
  - timestamp defaults and update trigger/function
- [ ] Include notes for required extension/function if needed.

### Task 7: Verify end-to-end flow

**Files:**
- Modify (if bug fixes found): related files above
- Test: `npm run lint`, manual QA in dev server

- [ ] Validate flow: unauthenticated -> Google sign-in -> onboarding -> room join.
- [ ] Validate existing user with complete profile joins directly.
- [ ] Validate username conflict and API errors show correctly.
- [ ] Re-run `npm run lint` and confirm clean output.
