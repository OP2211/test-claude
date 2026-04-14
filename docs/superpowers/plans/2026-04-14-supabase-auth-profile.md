# Supabase Auth + Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Supabase auth (email/password + Google) with mandatory profile fields and abusive-username blocking.

**Architecture:** Replace the current NextAuth session flow with Supabase session clients for browser and server, persist required user metadata in a `profiles` table, and enforce validation + abuse filtering in shared server-side helpers and API routes.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), existing content filter lexicon.

---

### Task 1: Supabase client wiring and env contracts

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/AuthContext.tsx`

- [ ] Add browser/server Supabase client factories and replace `SessionProvider` usage.
- [ ] Ensure root layout wraps app with Supabase auth context provider.
- [ ] Remove NextAuth-specific popup bridge behavior.

### Task 2: Profile schema + validation helpers

**Files:**
- Create: `src/lib/profile/validation.ts`
- Create: `src/lib/profile/types.ts`
- Create: `supabase/migrations/20260414_profiles.sql`
- Test: `src/lib/profile/validation.test.ts`

- [ ] Write failing tests for username regex, abusive-name blocking, and E.164 phone format.
- [ ] Run tests to verify failure.
- [ ] Implement minimal validation code to pass tests.
- [ ] Add SQL migration for `profiles` table, constraints, unique username, and RLS policies.
- [ ] Re-run tests and confirm pass.

### Task 3: Auth and profile API routes

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Create: `src/app/api/auth/profile/route.ts`
- Modify: `src/app/auth/auth-popup-done/page.tsx`

- [ ] Implement signup endpoint: validate payload, create Supabase auth user, insert profile.
- [ ] Implement profile upsert endpoint for OAuth completion and profile updates.
- [ ] Return structured errors for abusive/invalid username and mobile formatting failures.

### Task 4: UI integration (sign up, sign in, Google)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/AppHeader.tsx`
- Create: `src/components/AuthModal.tsx`
- Modify: `src/components/OnboardingModal.tsx`
- Modify: `src/lib/google-signin-popup.ts`

- [ ] Add auth modal with sign in/sign up forms and required profile fields.
- [ ] Switch Google login flow to Supabase OAuth popup flow.
- [ ] Ensure OAuth-first users complete required profile fields before entering app.
- [ ] Remove local-storage-only identity assumptions; source identity from Supabase + profile.

### Task 5: Verification and cleanup

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] Add/verify test script and run validation tests.
- [ ] Run lint for changed files and resolve issues.
- [ ] Document required env vars and Supabase setup notes.
