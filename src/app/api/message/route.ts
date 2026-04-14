import { NextResponse, type NextRequest } from 'next/server';
import { addMessage } from '@/lib/store';
import { trigger } from '@/lib/pusher';
import { maskOffensiveText } from '@/lib/content-filter';

export async function POST(request: NextRequest) {
  const { matchId, tab, userId, username, fanTeamId, image, text } = await request.json();
  if (!matchId || !tab || !text?.trim()) {
    return NextResponse.json({ error: 'matchId, tab, and text are required' }, { status: 400 });
  }
  const { maskedText, hasMatch, reason } = maskOffensiveText(text);
  const msg = await addMessage(matchId, {
    tab,
    userId,
    username,
    fanTeamId,
    image,
    text: maskedText,
    moderation: hasMatch
      ? {
          moderated: true,
          reason: reason || 'Contains restricted language per community moderation policy.',
          by: 'admin',
        }
      : undefined,
  });
  await trigger(matchId, 'new-message', msg);
  return NextResponse.json({
    message: msg,
    moderation: {
      moderated: hasMatch,
      warning: hasMatch ? 'Content moderated: your message contained restricted language and was sanitized.' : null,
    },
  }, { status: 201 });
}
