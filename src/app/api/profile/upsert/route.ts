import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isUsernameAvailable, upsertProfile } from '@/lib/profile-repo';
import { persistProfileImageLocally } from '@/lib/profile-image';
import { validateProfileInput } from '@/lib/profile-validation';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const validation = validateProfileInput(payload);
  if (!validation.value) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const isAvailable = await isUsernameAvailable(validation.value.username, googleSub);
    if (!isAvailable) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    let profileImage: string | null = session.user?.image ?? null;
    try {
      profileImage = await persistProfileImageLocally(googleSub, session.user?.image);
    } catch {
      // Don't block onboarding if avatar download fails.
      profileImage = session.user?.image ?? null;
    }

    const profile = await upsertProfile({
      googleSub,
      fullName: session.user?.name ?? null,
      email: session.user?.email ?? null,
      image: profileImage,
      username: validation.value.username,
      phone: validation.value.phone,
      fanTeamId: validation.value.fanTeamId,
      dob: validation.value.dob,
      city: validation.value.city,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save profile' },
      { status: 500 },
    );
  }
}
