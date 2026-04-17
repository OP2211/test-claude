import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  getFoundingFanTierForSupporter,
  getProfileByGoogleSub,
  getReferralSnapshotByGoogleSub,
  isTeamLeaderForSupporter,
} from '@/lib/profile-repo';
import { isOnboardingComplete } from '@/lib/profile-validation';

export async function GET() {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getProfileByGoogleSub(googleSub);
    const referralSnapshot = profile
      ? await getReferralSnapshotByGoogleSub(googleSub)
      : { invitedBy: null, invitedMembers: [] };
    const isTeamLeader = profile?.fan_team_id
      ? await isTeamLeaderForSupporter(googleSub, profile.fan_team_id)
      : false;
    const foundingFanTier = profile?.fan_team_id
      ? await getFoundingFanTierForSupporter(googleSub, profile.fan_team_id)
      : null;
    return NextResponse.json({
      profile,
      referralCode: profile?.referral_code ?? null,
      invitedBy: referralSnapshot.invitedBy,
      invitedMembers: referralSnapshot.invitedMembers,
      invitedCount: referralSnapshot.invitedMembers.length,
      isTeamLeader,
      foundingFanTier,
      isOnboardingComplete: isOnboardingComplete(profile),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
