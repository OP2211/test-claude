# Supabase Auth and Profile Design

## Goal

Add Supabase authentication alongside the current Google sign-in experience, supporting:

- Email/password sign up and login
- Google sign-in
- Mandatory profile capture and storage for:
  - name
  - username
  - email
  - mobile number (E.164 format)
  - team
- Optional profile picture URL

No email verification is required for now.

## Architecture

Use Supabase as the single source for auth/session and profile persistence.

- Auth provider: Supabase Auth
  - Email/password
  - Google OAuth
- Profile storage: `public.profiles` table keyed by `auth.users.id`
- UI/session in app reads Supabase session and profile, instead of splitting session logic across providers.

This avoids dual auth stacks and keeps identity/profile behavior consistent across login methods.

## Data Model

Create `public.profiles`:

- `id uuid primary key references auth.users(id) on delete cascade`
- `name text not null`
- `username text not null unique`
- `email text not null`
- `mobile_number text not null`
- `team text not null`
- `avatar_url text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- `username` format check: lowercase letters, digits, underscore, 3-20 chars
- `mobile_number` format check: E.164 (`^\+[1-9]\d{7,14}$`)

## Validation and Abuse Filtering

Server-side validation is authoritative. Client-side validation is advisory for UX.

### Username Rules

- Required
- Regex format and length restrictions
- Uniqueness enforced in DB
- Abusive terms are blocked, not auto-cleaned

### Abuse Check

Use existing content filter lexicon to reject abusive usernames during:

- sign up
- profile update when username changes

Error message should ask user to choose a different username.

## Auth and Profile Flows

### Email/Password Sign Up

1. User submits profile + auth fields.
2. Validate inputs (including username abuse check, E.164 mobile).
3. Create Supabase auth user.
4. Create profile row linked to auth user id.
5. Redirect to app/profile after success.

### Email/Password Login

1. User enters email/password.
2. Supabase session established.
3. App loads profile by user id.

### Google Sign-In

1. User starts Supabase Google OAuth.
2. On callback/session, ensure profile exists:
   - if missing, route user to complete required fields (`username`, `mobile_number`, `team`, `name` if absent)
3. Block completion if username is abusive or invalid.

## Security

- Enable RLS on `public.profiles`
- Policies:
  - users can `select` their own row (`auth.uid() = id`)
  - users can `insert` their own row
  - users can `update` their own row
- No client trust for authorization or abuse checks.

## UI Changes

Add or update auth UI to include:

- Sign up form:
  - name
  - username
  - email
  - password
  - mobile number (E.164)
  - team
  - optional avatar URL
- Sign in form:
  - email
  - password
- Google button in same auth entry flow

Add profile completion/edit screen for users missing required data, especially OAuth-first users.

## Error Handling

Show specific user-facing messages for:

- invalid username format
- abusive username
- username already taken
- invalid mobile number format
- duplicate email / auth errors
- network/server failures

## Testing Strategy

- Unit tests for validation helpers:
  - username regex
  - mobile E.164 parsing/validation
  - abusive username detection
- Integration test for sign-up flow success/failure cases
- Integration test for OAuth user profile-completion path
- Verify RLS policies by ensuring cross-user profile access is denied

## Out of Scope (For Now)

- Email verification flow
- OTP/phone auth
- SMS verification of mobile number
- Avatar uploads to storage (URL only for this phase)
