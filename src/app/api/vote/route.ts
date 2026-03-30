import { NextResponse, type NextRequest } from 'next/server';
import { castVote, getVoteTally } from '@/lib/store';
import { trigger } from '@/lib/pusher';
import type { VoteChoice } from '@/lib/types';

const VALID_VOTES: VoteChoice[] = ['home', 'draw', 'away'];

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  return NextResponse.json(getVoteTally(matchId));
}

export async function POST(request: NextRequest) {
  const { matchId, userId, vote } = await request.json();
  if (!matchId || !userId || !VALID_VOTES.includes(vote)) {
    return NextResponse.json({ error: 'matchId, userId, and a valid vote (home|draw|away) are required' }, { status: 400 });
  }
  const tally = castVote(matchId, userId, vote);
  await trigger(matchId, 'vote-updated', tally);
  return NextResponse.json(tally);
}
