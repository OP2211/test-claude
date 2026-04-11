import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = await getMatches();
  return NextResponse.json(matches);
}
