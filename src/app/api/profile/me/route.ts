import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getProfileByGoogleSub, isTeamLeaderForSupporter } from '@/lib/profile-repo';
import { isOnboardingComplete } from '@/lib/profile-validation';

export async function GET() {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getProfileByGoogleSub(googleSub);
    const isTeamLeader = profile?.fan_team_id
      ? await isTeamLeaderForSupporter(googleSub, profile.fan_team_id)
      : false;
    return NextResponse.json({
      profile,
      isTeamLeader,
      isOnboardingComplete: isOnboardingComplete(profile),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
