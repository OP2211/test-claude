import { describe, expect, it } from 'vitest';
import {
  isValidE164Phone,
  normalizeUsername,
  validateUsername,
} from '@/lib/profile/validation';

describe('profile validation', () => {
  it('normalizes usernames to lowercase and underscore format', () => {
    expect(normalizeUsername('John Doe')).toBe('john_doe');
  });

  it('rejects invalid username patterns', () => {
    const result = validateUsername('Ab');
    expect(result.ok).toBe(false);
  });

  it('accepts E.164 phone format', () => {
    expect(isValidE164Phone('+919876543210')).toBe(true);
    expect(isValidE164Phone('9876543210')).toBe(false);
  });
});
