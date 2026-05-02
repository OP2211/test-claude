import { NextResponse } from 'next/server';
import { fetchCricketMatches } from '@/lib/cricket/espn';

export async function GET() {
  try {
    const matches = await fetchCricketMatches();
    return NextResponse.json(matches, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[api/cricket/matches] failed', err);
    return NextResponse.json({ error: 'Failed to fetch cricket matches' }, { status: 500 });
  }
}
