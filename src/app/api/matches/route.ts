import { NextResponse, type NextRequest } from 'next/server';
import { getMatches } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const matches = await getMatches();
  return NextResponse.json(matches);
}
