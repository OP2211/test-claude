import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { uploadProfileImageFile } from '@/lib/profile-image';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const googleSub = session?.user?.googleSub;
  if (!googleSub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const maybeFile = formData.get('image');
    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: 'Please choose an image file.' }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(maybeFile.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP, and GIF images are allowed.' },
        { status: 400 },
      );
    }

    if (maybeFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller.' }, { status: 400 });
    }

    const arrayBuffer = await maybeFile.arrayBuffer();
    const imageUrl = await uploadProfileImageFile(googleSub, Buffer.from(arrayBuffer), maybeFile.type);

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin is not configured' }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ image: imageUrl })
      .eq('google_sub', googleSub);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile image' },
      { status: 500 },
    );
  }
}
