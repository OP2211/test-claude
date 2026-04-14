import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isUsernameAvailable } from '@/lib/profile-repo';
import { validateUsername } from '@/lib/profile-validation';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;

  const usernameRaw = request.nextUrl.searchParams.get('username') ?? '';
  const validation = validateUsername(usernameRaw);
  if (!validation.value) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const available = await isUsernameAvailable(validation.value, googleSub);
    return NextResponse.json({ available });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check username' },
      { status: 500 },
    );
  }
}
