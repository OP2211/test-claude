import { isCricketMatchId } from '@/lib/cricket/espn';
import type { CricketMatch } from '@/lib/cricket/types';
import type { Match } from '@/lib/types';

type MatchLifecycleStatus = 'upcoming' | 'live' | 'finished';

function isPastBeyondBuffer(isoDate: string | undefined, pastBufferMinutes: number): boolean {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > pastBufferMinutes * 60_000;
}

export function isFootballMatchReadOnly(match: Pick<Match, 'status'> & { kickoff?: string }): boolean {
  if (match.status === 'finished') return true;
  // ESPN can lag status updates; once well beyond expected match duration, force read-only.
  return match.status !== 'live' && isPastBeyondBuffer(match.kickoff, 150);
}

export function isCricketMatchReadOnly(match: Pick<CricketMatch, 'status'> & { start?: string }): boolean {
  if (match.status === 'finished') return true;
  // IPL T20 + innings break + delay buffer.
  return match.status !== 'live' && isPastBeyondBuffer(match.start, 360);
}

export function isMatchIdReadOnlyStatus(matchId: string, status: MatchLifecycleStatus): boolean {
  if (isCricketMatchId(matchId)) {
    return isCricketMatchReadOnly({ status, start: undefined });
  }
  return isFootballMatchReadOnly({ status, kickoff: undefined });
}
