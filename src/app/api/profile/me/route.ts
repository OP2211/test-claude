import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getProfileByGoogleSub } from '@/lib/profile-repo';
import { isOnboardingComplete } from '@/lib/profile-validation';

export async function GET() {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getProfileByGoogleSub(googleSub);
    return NextResponse.json({
      profile,
      isOnboardingComplete: isOnboardingComplete(profile),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
