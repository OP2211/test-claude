import { NextResponse } from 'next/server';
import { fetchTopContributors } from '@/lib/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  const contributors = await fetchTopContributors('eng.1');
  return NextResponse.json(contributors);
}
