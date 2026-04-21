import { describe, expect, it } from 'vitest';
import { maskOffensiveText } from './index';

describe('maskOffensiveText', () => {
  it('masks multiple abusive words in a single message', () => {
    const input = 'You are fuck and shit';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(true);
    expect(result.maskedText).not.toContain('fuck');
    expect(result.maskedText).not.toContain('shit');
    expect(result.maskedText).toMatch(/@#\$%/);
    expect(result.maskedText).toContain('and');
  });

  it('masks abusive variants and leetspeak forms', () => {
    const input = 'fck this sh1t right now';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(true);
    expect(result.maskedText).not.toContain('fck');
    expect(result.maskedText).not.toContain('sh1t');
    expect(result.maskedText).toContain('this');
    expect(result.maskedText).toContain('right now');
  });

  it('masks split-letter profanity patterns', () => {
    const input = 'Why are you f u c k being rude?';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(true);
    expect(result.maskedText).not.toContain('f u c k');
    expect(result.maskedText).toContain('being rude?');
  });

  it('masks punctuation-separated split-letter profanity patterns', () => {
    const input = 'Stop acting like f.u.c.k and f_u_c_k in chat';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(true);
    expect(result.maskedText).not.toContain('f.u.c.k');
    expect(result.maskedText).not.toContain('f_u_c_k');
    expect(result.maskedText).toContain('in chat');
  });

  it('does not mask safe words containing blocked substrings', () => {
    const input = 'classic passage and assignment are safe words';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(false);
    expect(result.maskedText).toBe(input);
  });

  it('masks mixed Hindi and English abusive words in one message', () => {
    const input = 'You are chutiya and fuck';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(true);
    expect(result.maskedText).not.toContain('chutiya');
    expect(result.maskedText).not.toContain('fuck');
    expect(result.maskedText).toContain('and');
  });

  it('returns unchanged text when no abusive content exists', () => {
    const input = 'Great game today, what a finish!';
    const result = maskOffensiveText(input);

    expect(result.hasMatch).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.maskedText).toBe(input);
  });
});
