import { NextResponse } from 'next/server';
import { fetchTopAssists } from '@/lib/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  const assists = await fetchTopAssists('eng.1');
  return NextResponse.json(assists);
}
