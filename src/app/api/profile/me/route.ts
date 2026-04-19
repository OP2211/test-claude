import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  type FoundingFanTier,
  getFoundingFanTierForSupporter,
  getProfileByGoogleSub,
  getReferralSnapshotByGoogleSub,
  isEarlyAdopterGoogleSub,
} from '@/lib/profile-repo';
import { isOnboardingComplete } from '@/lib/profile-validation';

/** Browser may reuse the response briefly on repeat navigations (user-specific: private + Vary). */
const PROFILE_ME_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
  Vary: 'Cookie',
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getProfileByGoogleSub(googleSub);
    if (!profile) {
      return NextResponse.json(
        {
          profile: null,
          referralCode: null,
          invitedBy: null,
          invitedMembers: [],
          invitedCount: 0,
          isTeamLeader: false,
          foundingFanTier: null,
          isEarlyAdopter: false,
          isOnboardingComplete: isOnboardingComplete(null),
        },
        { headers: PROFILE_ME_CACHE_HEADERS },
      );
    }

    const [referralSnapshot, foundingFanTier, isEarlyAdopter] = await Promise.all([
      getReferralSnapshotByGoogleSub(googleSub),
      profile.fan_team_id
        ? getFoundingFanTierForSupporter(googleSub, profile.fan_team_id)
        : Promise.resolve(null as FoundingFanTier),
      isEarlyAdopterGoogleSub(googleSub),
    ]);

    const isTeamLeader = foundingFanTier === 'founding';

    return NextResponse.json(
      {
        profile,
        referralCode: profile.referral_code ?? null,
        invitedBy: referralSnapshot.invitedBy,
        invitedMembers: referralSnapshot.invitedMembers,
        invitedCount: referralSnapshot.invitedMembers.length,
        isTeamLeader,
        foundingFanTier,
        isEarlyAdopter,
        isOnboardingComplete: isOnboardingComplete(profile),
      },
      { headers: PROFILE_ME_CACHE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
