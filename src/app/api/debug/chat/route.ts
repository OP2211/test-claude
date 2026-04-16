import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMessages } from '@/lib/store';
import type { TabId } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_TABS: TabId[] = ['predictions', 'teamsheet', 'banter'];

function isTabId(value: string): value is TabId {
  return VALID_TABS.includes(value as TabId);
}

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId')?.trim() || '';
  const tabParam = request.nextUrl.searchParams.get('tab')?.trim() || 'predictions';
  const tab: TabId = isTabId(tabParam) ? tabParam : 'predictions';

  if (!matchId) {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const host = (() => {
    if (!url) return null;
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  })();

  const keyInfo = {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasPublishable: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  let rawCount: number | null = null;
  let rawError: string | null = null;
  let rawSample: unknown = null;
  if (supabase) {
    const { data: rawRows, error: rawRowsError } = await supabase
      .from('chat_messages')
      .select('id,reactions,timestamp')
      .eq('match_id', matchId)
      .eq('tab', tab)
      .order('timestamp', { ascending: false })
      .limit(3);

    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('tab', tab);
    rawCount = count ?? 0;
    rawError = rawRowsError?.message ?? error?.message ?? null;
    rawSample = rawRows ?? null;
  }

  const page = await getMessages(matchId, tab, { limit: 50 });

  return NextResponse.json({
    request: { matchId, tab },
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      supabaseHost: host,
      hasSupabaseClient: Boolean(supabase),
      keyInfo,
    },
    rawQuery: {
      count: rawCount,
      error: rawError,
      sample: rawSample,
    },
    getMessagesResult: {
      count: page.messages.length,
      hasMore: page.hasMore,
      sampleIds: page.messages.slice(0, 3).map((m) => m.id),
      sampleReactions: page.messages.slice(0, 3).map((m) => ({ id: m.id, reactions: m.reactions })),
    },
  });
}
