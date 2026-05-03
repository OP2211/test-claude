-- Per-sport fan teams: a user may now have a football team, a cricket team, or both.
-- The original profiles table required fan_team_id NOT NULL, but a user onboarding
-- from /cricket/matches has no football team to commit to yet — so we drop the
-- constraint and ensure the cricket column exists.

-- 1. Add the cricket fan team column (idempotent — already run by hand if it exists).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cricket_fan_team_id text;

-- 2. Allow fan_team_id to be null so cricket-only users can complete onboarding.
ALTER TABLE profiles
  ALTER COLUMN fan_team_id DROP NOT NULL;
