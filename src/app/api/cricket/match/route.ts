import { NextResponse, type NextRequest } from 'next/server';
import { fetchCricketMatchDetailed } from '@/lib/cricket/espn';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  try {
    const match = await fetchCricketMatchDetailed(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    return NextResponse.json(match, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[api/cricket/match] failed', err);
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}
