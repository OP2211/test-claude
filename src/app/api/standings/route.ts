import { NextResponse } from 'next/server';
import { fetchStandingsWithNextMatch } from '@/lib/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  const standings = await fetchStandingsWithNextMatch('eng.1');
  return NextResponse.json(standings);
}
