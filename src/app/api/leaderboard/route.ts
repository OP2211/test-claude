import { NextResponse, type NextRequest } from 'next/server';
import { getLeaderboardProfiles } from '@/lib/profile-repo';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 15;

export async function GET(request: NextRequest) {
  const search = (request.nextUrl.searchParams.get('search') || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10));
  const sort = request.nextUrl.searchParams.get('sort') || 'latest';

  const allProfiles = await getLeaderboardProfiles();

  // Filter by search
  const filtered = search
    ? allProfiles.filter(p => {
        const name = (p.full_name?.trim() || p.username).toLowerCase();
        const uname = p.username.toLowerCase();
        return name.includes(search) || uname.includes(search);
      })
    : allProfiles;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'messages') return b.messagesSent - a.messagesSent;
    if (sort === 'reactions') return b.reactionsReceived - a.reactionsReceived;
    if (sort === 'invites') return b.successfulInvites - a.successfulInvites;
    if (sort === 'name') {
      const nameA = (a.full_name?.trim() || a.username).toLowerCase();
      const nameB = (b.full_name?.trim() || b.username).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    // default: latest
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  const total = sorted.length;
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const users = sorted.slice(start, end);
  const hasMore = end < total;

  return NextResponse.json({ users, total, hasMore, page });
}
