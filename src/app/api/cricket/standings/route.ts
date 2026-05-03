import { NextResponse } from 'next/server';
import { fetchCricketSeasonMatches } from '@/lib/cricket/espn';
import { computeIplStandings } from '@/lib/cricket/standings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await fetchCricketSeasonMatches();
    const standings = computeIplStandings(matches);
    return NextResponse.json(
      { standings },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/cricket/standings] failed', err);
    return NextResponse.json({ error: 'Failed to compute standings' }, { status: 500 });
  }
}
