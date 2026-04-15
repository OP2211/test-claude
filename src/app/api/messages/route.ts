import { NextResponse, type NextRequest } from 'next/server';
import { getMessages } from '@/lib/store';
import type { TabId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId');
  const tab = request.nextUrl.searchParams.get('tab') as TabId | null;
  if (!matchId || !tab) {
    return NextResponse.json({ error: 'matchId and tab are required' }, { status: 400 });
  }
  return NextResponse.json(await getMessages(matchId, tab));
}
