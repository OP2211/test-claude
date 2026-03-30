import { NextResponse, type NextRequest } from 'next/server';
import { toggleReaction } from '@/lib/store';
import { trigger } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  const { matchId, tab, messageId, emoji, userId } = await request.json();
  if (!matchId || !tab || !messageId || !emoji || !userId) {
    return NextResponse.json({ error: 'matchId, tab, messageId, emoji, and userId are required' }, { status: 400 });
  }
  const reactions = toggleReaction(matchId, tab, messageId, emoji, userId);
  if (!reactions) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  await trigger(matchId, 'reaction-updated', { messageId, reactions });
  return NextResponse.json({ messageId, reactions });
}
