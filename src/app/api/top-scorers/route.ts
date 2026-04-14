import { NextResponse } from 'next/server';
import { fetchTopScorers } from '@/lib/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scorers = await fetchTopScorers('eng.1');
  return NextResponse.json(scorers);
}
