import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { setCricketFanTeam } from '@/lib/profile-repo';
import { validateCricketTeamId } from '@/lib/profile-validation';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;
  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const validation = validateCricketTeamId(payload);
  if (!validation.value) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const profile = await setCricketFanTeam(googleSub, validation.value);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found. Complete onboarding first.' }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update cricket team' },
      { status: 500 },
    );
  }
}
