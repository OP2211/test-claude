import { NextResponse, type NextRequest } from 'next/server';
import { castVote, getVoteSnapshot } from '@/lib/store';
import { trigger } from '@/lib/pusher';
import type { TeamId, VoteChoice } from '@/lib/types';

const VALID_VOTES: VoteChoice[] = ['home', 'draw', 'away'];

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  return NextResponse.json(getVoteSnapshot(matchId));
}

export async function POST(request: NextRequest) {
  const { matchId, userId, vote, username, image, fanTeamId } = await request.json();
  if (!matchId || !userId || !VALID_VOTES.includes(vote)) {
    return NextResponse.json({ error: 'matchId, userId, and a valid vote (home|draw|away) are required' }, { status: 400 });
  }
  const name =
    typeof username === 'string' && username.trim()
      ? username.trim().slice(0, 64)
      : 'A fan';
  const snapshot = castVote(matchId, userId, vote, {
    username: name,
    image: typeof image === 'string' ? image : undefined,
    fanTeamId:
      fanTeamId === undefined ? undefined : fanTeamId === null ? null : (fanTeamId as TeamId),
  });
  await trigger(matchId, 'vote-updated', {
    tally: snapshot.tally,
    byChoice: snapshot.byChoice,
    history: snapshot.history,
    userId,
    username: name,
    vote,
  });
  return NextResponse.json(snapshot);
}
