import enLexicon from '@/lib/content-filter/lexicon/en.json';
import hiInLexicon from '@/lib/content-filter/lexicon/hi-in.json';
import type { FilterLexiconFile, MaskResult } from '@/lib/content-filter/types';

interface Span {
  start: number;
  end: number;
}

const MASK_SYMBOLS = '@#$%&!';

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
};

const TOKEN_RE = /[\p{L}\p{N}@!$._-]+/gu;
const SPLIT_LETTER_RE = /(?:\b[\p{L}\p{N}@!$]\b(?:\s+|[._-])+){1,}[\p{L}\p{N}@!$]\b/gu;

const lexicons = [enLexicon as FilterLexiconFile, hiInLexicon as FilterLexiconFile];

function normalizeChar(ch: string): string {
  const lower = ch.toLowerCase();
  return LEET_MAP[lower] ?? lower;
}

function normalizeToken(input: string): string {
  const decomposed = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const leetFolded = Array.from(decomposed, normalizeChar).join('');
  const compact = leetFolded.replace(/[^\p{L}\p{N}\u0900-\u097F]+/gu, '');
  return compact.toLowerCase().replace(/(.)\1{2,}/g, '$1$1');
}

function buildTermSet(files: FilterLexiconFile[]): { blockedTerms: Set<string>; safeTerms: Set<string> } {
  const blockedTerms = new Set<string>();
  const safeTerms = new Set<string>();

  for (const file of files) {
    for (const safeWord of file.safeWords) {
      safeTerms.add(normalizeToken(safeWord));
    }

    for (const entries of Object.values(file.categories)) {
      for (const entry of entries) {
        blockedTerms.add(normalizeToken(entry.term));
        for (const variant of entry.variants || []) {
          blockedTerms.add(normalizeToken(variant));
        }
      }
    }
  }
  return { blockedTerms, safeTerms };
}

const { blockedTerms, safeTerms } = buildTermSet(lexicons);

function collectMatchSpans(text: string, pattern: RegExp, spans: Span[]): void {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  for (const match of text.matchAll(regex)) {
    const raw = match[0];
    const normalized = normalizeToken(raw);
    if (!normalized || safeTerms.has(normalized)) continue;
    if (blockedTerms.has(normalized)) {
      const start = match.index ?? -1;
      if (start < 0) continue;
      spans.push({ start, end: start + raw.length });
    }
  }
}

function mergeSpans(spans: Span[]): Span[] {
  if (spans.length === 0) return spans;
  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [spans[0]];
  for (let i = 1; i < spans.length; i += 1) {
    const current = spans[i];
    const last = merged[merged.length - 1];
    if (current.start > last.end) {
      merged.push(current);
      continue;
    }
    last.end = Math.max(last.end, current.end);
  }
  return merged;
}

function maskSpans(text: string, spans: Span[]): string {
  let result = text;
  for (let i = spans.length - 1; i >= 0; i -= 1) {
    const { start, end } = spans[i];
    const length = end - start;
    const mask = Array.from({ length }, (_, idx) => MASK_SYMBOLS[idx % MASK_SYMBOLS.length]).join('');
    result = `${result.slice(0, start)}${mask}${result.slice(end)}`;
  }
  return result;
}

export function maskOffensiveText(text: string): MaskResult {
  if (!text?.trim()) {
    return { maskedText: text || '', hasMatch: false, reason: null };
  }

  const spans: Span[] = [];
  collectMatchSpans(text, TOKEN_RE, spans);
  collectMatchSpans(text, SPLIT_LETTER_RE, spans);

  const merged = mergeSpans(spans);
  if (merged.length === 0) {
    return { maskedText: text, hasMatch: false, reason: null };
  }

  return {
    maskedText: maskSpans(text, merged),
    hasMatch: true,
    reason: 'Contains restricted language per community moderation policy.',
  };
}
