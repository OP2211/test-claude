import { NextResponse, type NextRequest } from 'next/server';
import { getMatches } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Only `/matches?demo=1` (and legacy true/yes) prepends the demo card — no deploy flag.
  const demoParam = request.nextUrl.searchParams.get('demo')?.toLowerCase();
  const includeDemo = demoParam === '1' || demoParam === 'true' || demoParam === 'yes';
  const matches = await getMatches({ includeDemo });
  return NextResponse.json(matches);
}
