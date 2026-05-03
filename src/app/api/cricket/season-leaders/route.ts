import { NextResponse } from 'next/server';
import { fetchIplSeasonLeaders } from '@/lib/cricket/season-leaders';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await fetchIplSeasonLeaders();
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[api/cricket/season-leaders] failed', err);
    return NextResponse.json({ error: 'Failed to compute season leaders' }, { status: 500 });
  }
}
