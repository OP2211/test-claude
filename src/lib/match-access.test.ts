import { describe, expect, it } from 'vitest';
import {
  isFootballMatchReadOnly,
  isCricketMatchReadOnly,
  isMatchIdReadOnlyStatus,
} from './match-access';

describe('match access policy', () => {
  it('marks finished football matches as read-only', () => {
    expect(isFootballMatchReadOnly({ status: 'finished', kickoff: new Date().toISOString() })).toBe(true);
    expect(isFootballMatchReadOnly({ status: 'live', kickoff: new Date().toISOString() })).toBe(false);
    expect(isFootballMatchReadOnly({ status: 'upcoming', kickoff: new Date().toISOString() })).toBe(false);
  });

  it('marks stale football matches as read-only even if status lags', () => {
    const staleKickoff = new Date(Date.now() - 4 * 60 * 60_000).toISOString();
    expect(isFootballMatchReadOnly({ status: 'upcoming', kickoff: staleKickoff })).toBe(true);
  });

  it('marks finished cricket matches as read-only', () => {
    expect(isCricketMatchReadOnly({ status: 'finished', start: new Date().toISOString() })).toBe(true);
    expect(isCricketMatchReadOnly({ status: 'live', start: new Date().toISOString() })).toBe(false);
    expect(isCricketMatchReadOnly({ status: 'upcoming', start: new Date().toISOString() })).toBe(false);
  });

  it('detects cricket ids from route ids', () => {
    expect(isMatchIdReadOnlyStatus('cricket-123', 'finished')).toBe(true);
    expect(isMatchIdReadOnlyStatus('cricket-123', 'live')).toBe(false);
    expect(isMatchIdReadOnlyStatus('fanground-123', 'finished')).toBe(true);
    expect(isMatchIdReadOnlyStatus('fanground-123', 'upcoming')).toBe(false);
  });
});
