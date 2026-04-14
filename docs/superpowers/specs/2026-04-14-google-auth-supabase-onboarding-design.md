# Google Auth + Supabase Onboarding Design

## Context

The app already supports Google sign-in and match room entry from the home screen. Today onboarding is local-only and does not persist full user profile data across sessions/devices.

We need users to sign in with Google, complete mandatory profile details, and only then join a match chat room.

## Goals

- Require Google authentication before entering a match room.
- Require onboarding fields before room entry:
  - `username` (required, globally unique, case-insensitive)
  - `phone` (required)
  - `team` (required)
  - `dob` (optional)
  - `city` (optional)
- Persist profile data to Supabase (not local-only).
- Keep existing team-selection popup UX and hardcoded team options.

## Non-Goals

- Building an admin-managed teams table.
- Migrating chat room data models.
- Adding advanced phone verification (OTP/SMS).

## High-Level Architecture

1. **Auth Layer (existing NextAuth Google sign-in)**
   - Continue using current Google sign-in flow.
   - Ensure Google provider account `sub` is available in session/JWT on the server.

2. **Profile API Layer (new Next.js API routes)**
   - `GET /api/profile/me`:
     - Auth required.
     - Resolve current user by Google `sub`.
     - Return profile + `isOnboardingComplete`.
   - `POST /api/profile/upsert`:
     - Auth required.
     - Validate payload and upsert profile by Google `sub`.
     - Enforce username uniqueness with case-insensitive lookup/constraint.

3. **Data Layer (Supabase)**
   - New `profiles` table with unique key by `google_sub`.
   - Case-insensitive unique username constraint/index.

4. **UI Layer**
   - Keep current flow in `page.tsx`.
   - Before room entry, check onboarding completion via API.
   - If incomplete, show onboarding modal and submit to API.
   - On success, continue pending room join.

## Data Model

`profiles` table fields:

- `id` uuid primary key default `gen_random_uuid()`
- `google_sub` text not null unique
- `email` text
- `image` text
- `username` text not null
- `phone` text not null
- `fan_team_id` text not null
- `dob` date null
- `city` text null
- `created_at` timestamptz default `now()`
- `updated_at` timestamptz default `now()`

Constraints:

- Unique `google_sub`.
- Unique lowercased `username` (case-insensitive uniqueness).
- Optional check constraint for minimum username length and allowed characters (implementation detail in plan).

## API Contracts

### `GET /api/profile/me`

Response:

- `profile`: profile object or `null`
- `isOnboardingComplete`: boolean

Completion criteria:

- `username`, `phone`, and `fan_team_id` are present and valid.

### `POST /api/profile/upsert`

Request:

- `username` (required)
- `phone` (required)
- `fanTeamId` (required)
- `dob` (optional)
- `city` (optional)

Server behavior:

- Derive `google_sub`, email, image from authenticated session (never trust client for identity).
- Validate required fields and team id.
- Validate username availability case-insensitively.
- Upsert profile by `google_sub`.
- Return canonical saved profile.

## Frontend Flow

1. User selects a match.
2. If not signed in, trigger Google sign-in popup.
3. After auth, call `GET /api/profile/me`.
4. If onboarding incomplete, open onboarding modal:
   - required: username, phone, team
   - optional: dob, city
   - keep existing team popup behavior
5. On submit, call `POST /api/profile/upsert`.
6. On success:
   - set user state from server profile
   - close onboarding
   - continue pending match room join
7. If complete already, join room directly.

## Validation and Error Handling

- **Username**
  - Required, trimmed.
  - Case-insensitive unique globally.
  - Conflict returns clear error (`username already taken`).
- **Phone**
  - Required, trimmed, basic format/length validation.
- **Team**
  - Required; must be in existing hardcoded team IDs.
- **DOB**
  - Optional; if supplied must parse as valid date.
- **City**
  - Optional; trimmed string.

Failure handling:

- Profile fetch failure blocks join and shows retryable error.
- Submit failure keeps modal open and surfaces field/global error.

## Security

- All profile routes require authenticated session.
- Identity is always derived server-side from Google `sub`.
- Users can read/write only their own profile row.
- No trust in client-provided user identifiers.

## Testing Strategy

- API route tests:
  - unauthenticated access rejected
  - onboarding completion computation
  - successful upsert
  - username conflict (case-insensitive)
  - invalid payload validation
- UI integration tests:
  - unauthenticated user prompted to Google login
  - incomplete profile triggers onboarding modal
  - successful onboarding continues into pending room
  - complete profile joins directly

## Rollout Plan

1. Add Supabase profile schema/migration.
2. Add server utilities and profile API routes.
3. Update onboarding modal submit payload/validation.
4. Update home page gating logic to profile API.
5. Verify flow manually and via tests.

## Risks and Mitigations

- **Missing Google `sub` in session**: update NextAuth callbacks to persist provider account id in token/session.
- **Username race condition**: enforce DB-level unique index on normalized username; handle conflict cleanly.
- **Partial state drift (UI vs server)**: treat server response as source of truth after save.
