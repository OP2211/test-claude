import { maskOffensiveText } from '@/lib/content-filter';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function isValidE164Phone(value: string): boolean {
  return E164_RE.test(value.trim());
}

export function validateUsername(rawValue: string): { ok: boolean; message?: string; username: string } {
  const username = normalizeUsername(rawValue);
  if (!USERNAME_RE.test(username)) {
    return { ok: false, message: 'Username must be 3-20 chars with lowercase letters, numbers, or _.', username };
  }
  const moderation = maskOffensiveText(username);
  if (moderation.hasMatch) {
    return { ok: false, message: 'Username contains restricted language. Please choose another one.', username };
  }
  return { ok: true, username };
}
