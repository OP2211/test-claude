import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { Message } from '@/lib/types';
import type { TabId } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId');
  const tab = request.nextUrl.searchParams.get('tab') as TabId | null;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const before = request.nextUrl.searchParams.get('before') || undefined;
  if (!matchId || !tab) {
    return NextResponse.json({ error: 'matchId and tab are required' }, { status: 400 });
  }

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
  const loadAll = !before && !limitParam;

  const supabase = getSupabaseAdmin(true);
  if (!supabase) {
    return NextResponse.json(
      { error: 'Chat persistence unavailable: SUPABASE_SERVICE_ROLE_KEY is required for /api/messages.' },
      { status: 500 },
    );
  }
  const pageSize = Math.max(1, Math.min(100, limit ?? 50));
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('match_id', matchId)
    .eq('tab', tab);

  if (before) {
    query = query.lt('timestamp', before);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as Array<{
    id: string;
    user_id: string;
    username: string;
    fan_team_id: string | null;
    image: string | null;
    tab: TabId;
    text: string;
    timestamp: string;
    reactions: Record<string, string[]> | null;
    moderation: Message['moderation'] | null;
  }>).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (loadAll) {
    const messages: Message[] = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fanTeamId: row.fan_team_id,
      image: row.image ?? undefined,
      tab: row.tab,
      text: row.text,
      timestamp: row.timestamp,
      reactions: row.reactions || {},
      moderation: row.moderation ?? undefined,
    }));
    return NextResponse.json(
      { messages, hasMore: false },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
    );
  }

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(-pageSize) : rows;
  const messages: Message[] = pageRows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    fanTeamId: row.fan_team_id,
    image: row.image ?? undefined,
    tab: row.tab,
    text: row.text,
    timestamp: row.timestamp,
    reactions: row.reactions || {},
    moderation: row.moderation ?? undefined,
  }));
  return NextResponse.json(
    { messages, hasMore },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
  );
}
