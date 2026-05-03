import type { TeamId } from '@/lib/types';
import { isCricketTeamId, isFootballTeamId } from '@/lib/teams';

export interface ProfileInput {
  username: string;
  phone: string;
  /** Football fan team. Optional — a cricket-only onboarder won't have one. */
  fanTeamId?: TeamId;
  /** Cricket fan team. Optional — a football-only onboarder won't have one. */
  cricketFanTeamId?: TeamId;
  dob: string | null;
  city: string | null;
}

export function validateUsername(usernameRaw: string): { value?: string; error?: string } {
  const username = usernameRaw.trim();
  if (!username) return { error: 'Username is required' };
  if (username.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscore' };
  }
  return { value: username };
}

function normalizePhoneDigits(phoneRaw: string): string {
  return phoneRaw.replace(/\D/g, '');
}

export function isOnboardingComplete(profile: {
  username?: string | null;
  phone?: string | null;
  fan_team_id?: string | null;
  cricket_fan_team_id?: string | null;
} | null): boolean {
  if (!profile) return false;
  const hasTeam = Boolean(profile.fan_team_id?.trim() || profile.cricket_fan_team_id?.trim());
  return Boolean(profile.username?.trim() && profile.phone?.trim() && hasTeam);
}

export function validateProfileInput(input: unknown): { value?: ProfileInput; error?: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Invalid payload' };
  }

  const payload = input as Record<string, unknown>;
  const usernameValidation = validateUsername(String(payload.username ?? ''));
  if (!usernameValidation.value) return { error: usernameValidation.error };
  const username = usernameValidation.value;
  const phoneRaw = String(payload.phone ?? '').trim();
  const fanTeamIdRaw = String(payload.fanTeamId ?? '').trim();
  const cricketFanTeamIdRaw = String(payload.cricketFanTeamId ?? '').trim();
  const dobRaw = payload.dob;
  const cityRaw = payload.city;

  if (!phoneRaw) return { error: 'Phone number is required' };
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (phoneDigits.length !== 10) {
    return { error: 'Phone number must have exactly 10 digits' };
  }

  // Caller may submit either a football team, a cricket team, or both — but at least one.
  if (!fanTeamIdRaw && !cricketFanTeamIdRaw) {
    return { error: 'Pick a team to support' };
  }
  if (fanTeamIdRaw && !isFootballTeamId(fanTeamIdRaw)) {
    return { error: 'Invalid football team selection' };
  }
  if (cricketFanTeamIdRaw && !isCricketTeamId(cricketFanTeamIdRaw)) {
    return { error: 'Invalid cricket team selection' };
  }

  let dob: string | null = null;
  if (typeof dobRaw === 'string' && dobRaw.trim()) {
    const parsed = new Date(dobRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Date of birth is invalid' };
    }
    dob = dobRaw;
  }

  const city = typeof cityRaw === 'string' && cityRaw.trim() ? cityRaw.trim() : null;

  return {
    value: {
      username,
      phone: phoneDigits,
      fanTeamId: fanTeamIdRaw || undefined,
      cricketFanTeamId: cricketFanTeamIdRaw || undefined,
      dob,
      city,
    },
  };
}

/** Validates a cricket team id payload for the standalone cricket fan-team flow. */
export function validateCricketTeamId(input: unknown): { value?: TeamId; error?: string } {
  if (!input || typeof input !== 'object') return { error: 'Invalid payload' };
  const raw = (input as Record<string, unknown>).cricketFanTeamId;
  const id = String(raw ?? '').trim();
  if (!id) return { error: 'cricketFanTeamId is required' };
  if (!isCricketTeamId(id)) return { error: 'Invalid cricket team selection' };
  return { value: id };
}
