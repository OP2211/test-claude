import { NextResponse, type NextRequest } from 'next/server';
import { toggleReaction } from '@/lib/store';
import { trigger } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  const { matchId, tab, messageId, emoji, userId, username, image } = await request.json();
  if (!matchId || !tab || !messageId || !emoji || !userId) {
    return NextResponse.json({ error: 'matchId, tab, messageId, emoji, and userId are required' }, { status: 400 });
  }
  const reactions = await toggleReaction(matchId, tab, messageId, emoji, userId);
  if (!reactions) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  const actor = {
    userId,
    username: typeof username === 'string' ? username : '',
    image: typeof image === 'string' ? image : undefined,
  };
  await trigger(matchId, 'reaction-updated', { messageId, reactions, emoji, actor });
  return NextResponse.json({ messageId, reactions, emoji, actor });
}
