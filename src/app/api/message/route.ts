import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { addMessage } from '@/lib/store';
import { trigger } from '@/lib/pusher';
import { maskOffensiveText } from '@/lib/content-filter';
import { authOptions } from '@/lib/auth-options';
import { isMatchReadOnlyById } from '@/lib/match-access-server';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;
  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { matchId, tab, username, fanTeamId, image, text } = await request.json();
  if (!matchId || !tab || !text?.trim()) {
    return NextResponse.json({ error: 'matchId, tab, and text are required' }, { status: 400 });
  }
  if (await isMatchReadOnlyById(matchId)) {
    return NextResponse.json({ error: 'Match is read-only' }, { status: 403 });
  }
  const { maskedText, hasMatch, reason } = maskOffensiveText(text);
  const author =
    typeof username === 'string' && username.trim()
      ? username.trim().slice(0, 64)
      : (session.user?.name?.trim() || 'A fan');
  const msg = await addMessage(matchId, {
    tab,
    userId: googleSub,
    username: author,
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
