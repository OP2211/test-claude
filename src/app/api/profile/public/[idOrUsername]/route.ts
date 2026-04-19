import { NextResponse } from 'next/server';
import {
  getFoundingFanTierForSupporter,
  getPublicProfileByIdOrUsername,
  getReferralSnapshotByGoogleSub,
  isEarlyAdopterGoogleSub,
} from '@/lib/profile-repo';

interface RouteContext {
  params: {
    idOrUsername: string;
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const key = decodeURIComponent(params.idOrUsername ?? '').trim();
  if (!key) {
    return NextResponse.json({ error: 'Invalid profile key' }, { status: 400 });
  }

  try {
    const profile = await getPublicProfileByIdOrUsername(key);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const [referralSnapshot, foundingFanTier, isEarlyAdopter] = await Promise.all([
      getReferralSnapshotByGoogleSub(profile.google_sub),
      profile.fan_team_id
        ? getFoundingFanTierForSupporter(profile.google_sub, profile.fan_team_id)
        : Promise.resolve(null),
      isEarlyAdopterGoogleSub(profile.google_sub),
    ]);

    return NextResponse.json({
      profile,
      invitedBy: referralSnapshot.invitedBy,
      invitedMembers: referralSnapshot.invitedMembers,
      invitedCount: referralSnapshot.invitedMembers.length,
      foundingFanTier,
      isEarlyAdopter,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
