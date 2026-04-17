import type { TeamId } from '@/lib/types';
import { isValidTeamId } from '@/lib/teams';

export interface ProfileInput {
  username: string;
  phone: string;
  fanTeamId: TeamId;
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
} | null): boolean {
  if (!profile) return false;
  return Boolean(profile.username?.trim() && profile.phone?.trim() && profile.fan_team_id?.trim());
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
  const dobRaw = payload.dob;
  const cityRaw = payload.city;

  if (!phoneRaw) return { error: 'Phone number is required' };
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (phoneDigits.length !== 10) {
    return { error: 'Phone number must have exactly 10 digits' };
  }

  if (!isValidTeamId(fanTeamIdRaw)) {
    return { error: 'Invalid team selection' };
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
      fanTeamId: fanTeamIdRaw,
      dob,
      city,
    },
  };
}
