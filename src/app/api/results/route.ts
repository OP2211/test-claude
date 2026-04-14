import { NextResponse } from 'next/server';
import { fetchRecentResults } from '@/lib/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = await fetchRecentResults();
  return NextResponse.json(results);
}
