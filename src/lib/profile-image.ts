import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const PROFILE_PICTURES_BUCKET = process.env.SUPABASE_PROFILE_PICS_BUCKET ?? 'profile';
const PROFILE_PICTURES_FOLDER = process.env.SUPABASE_PROFILE_PICS_FOLDER ?? 'profile';
const SUPABASE_PUBLIC_STORAGE_SEGMENT = '/storage/v1/object/public/';

function isSupabaseStoragePublicUrl(value: string): boolean {
  return value.includes(
    `${SUPABASE_PUBLIC_STORAGE_SEGMENT}${PROFILE_PICTURES_BUCKET}/${PROFILE_PICTURES_FOLDER}/`,
  );
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';
  const normalized = contentType.toLowerCase();
  if (normalized.includes('image/png')) return 'png';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/gif')) return 'gif';
  return 'jpg';
}

export async function persistProfileImageLocally(
  googleSub: string,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return null;
  if (isSupabaseStoragePublicUrl(trimmed)) return trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return trimmed;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return trimmed;
  }

  const response = await fetch(trimmed, {
    headers: {
      'User-Agent': 'FanGround/1.0',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile image (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error('Profile image response was empty');
  }

  const fileHash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const extension = extensionFromContentType(response.headers.get('content-type'));
  const objectPath = `${PROFILE_PICTURES_FOLDER}/${googleSub}-${fileHash}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(objectPath, buffer, {
      contentType: response.headers.get('content-type') ?? `image/${extension}`,
      upsert: true,
      cacheControl: '31536000',
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from(PROFILE_PICTURES_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}
