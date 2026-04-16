import { NextResponse, type NextRequest } from 'next/server';
import { getMatch } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const demo = request.nextUrl.searchParams.get('demo')?.toLowerCase();
  const includeDemo = demo === '1' || demo === 'true' || demo === 'yes';
  const match = await getMatch(id || '', { includeDemo });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  return NextResponse.json(match);
}
