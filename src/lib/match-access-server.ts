import { fetchCricketMatchDetailed, isCricketMatchId } from '@/lib/cricket/espn';
import { getMatch } from '@/lib/data';
import { isCricketMatchReadOnly, isFootballMatchReadOnly } from '@/lib/match-access';

export async function isMatchReadOnlyById(matchId: string): Promise<boolean> {
  if (isCricketMatchId(matchId)) {
    const match = await fetchCricketMatchDetailed(matchId);
    return match ? isCricketMatchReadOnly(match) : false;
  }
  const match = await getMatch(matchId);
  return match ? isFootballMatchReadOnly(match) : false;
}
