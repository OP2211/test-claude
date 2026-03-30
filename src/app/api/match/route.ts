import { NextResponse, type NextRequest } from 'next/server';
import { getMatch } from '@/lib/data';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const match = getMatch(id || '');
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  return NextResponse.json(match);
}
