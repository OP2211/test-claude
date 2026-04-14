export interface FilterLexiconEntry {
  term: string;
  severity: 'high' | 'medium' | 'low';
  variants?: string[];
  contextSensitive?: boolean;
}

export interface FilterLexiconFile {
  language: string;
  version: number;
  safeWords: string[];
  categories: Record<string, FilterLexiconEntry[]>;
}

export interface MaskResult {
  maskedText: string;
  hasMatch: boolean;
  reason: string | null;
}
