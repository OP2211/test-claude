import { NextResponse, type NextRequest } from 'next/server';
import { addMessage } from '@/lib/store';
import { trigger } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  const { matchId, tab, userId, username, fanTeamId, image, text } = await request.json();
  if (!matchId || !tab || !text?.trim()) {
    return NextResponse.json({ error: 'matchId, tab, and text are required' }, { status: 400 });
  }
  const msg = await addMessage(matchId, { tab, userId, username, fanTeamId, image, text });
  await trigger(matchId, 'new-message', msg);
  return NextResponse.json(msg, { status: 201 });
}
