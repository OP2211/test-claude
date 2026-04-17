import { NextResponse } from 'next/server';
import { getFoundingFanTierForSupporter, getPublicProfileByIdOrUsername, getReferralSnapshotByGoogleSub } from '@/lib/profile-repo';

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

    const referralSnapshot = await getReferralSnapshotByGoogleSub(profile.google_sub);
    const foundingFanTier = profile.fan_team_id
      ? await getFoundingFanTierForSupporter(profile.google_sub, profile.fan_team_id)
      : null;

    return NextResponse.json({
      profile,
      invitedBy: referralSnapshot.invitedBy,
      invitedMembers: referralSnapshot.invitedMembers,
      invitedCount: referralSnapshot.invitedMembers.length,
      foundingFanTier,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
