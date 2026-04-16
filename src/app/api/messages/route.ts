import { NextResponse, type NextRequest } from 'next/server';
import { getMessages } from '@/lib/store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { Message } from '@/lib/types';
import type { TabId } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const pageSize = Math.max(1, Math.min(100, limit ?? 50));
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('tab', tab)
      .order('timestamp', { ascending: false })
      .limit(pageSize + 1);

    if (before) {
      query = query.lt('timestamp', before);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const rows = data as Array<{
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
      }>;
      const hasMore = rows.length > pageSize;
      const pageRows = (hasMore ? rows.slice(0, pageSize) : rows).reverse();
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
      return NextResponse.json({ messages, hasMore });
    }

    // Guard against inconsistent empty reads: if table has rows for this message
    // scope but ordered query comes back empty, run an unordered fallback.
    const { count: scopedCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('tab', tab);

    if ((scopedCount ?? 0) > 0) {
      let fallbackQuery = supabase
        .from('chat_messages')
        .select('*')
        .eq('match_id', matchId)
        .eq('tab', tab);

      if (before) {
        fallbackQuery = fallbackQuery.lt('timestamp', before);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        const rows = (fallbackData as Array<{
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
        return NextResponse.json({ messages, hasMore });
      }
    }
  }

  return NextResponse.json(await getMessages(matchId, tab, { limit, before }));
}
