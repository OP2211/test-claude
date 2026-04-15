import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const STORAGE_PUBLIC_SEGMENT = '/storage/v1/object/public/';

function loadEnvFile(fileName) {
  const fullPath = resolve(process.cwd(), fileName);
  if (!existsSync(fullPath)) return;
  const raw = readFileSync(fullPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function isAlreadyMigrated(url, bucket, folder) {
  return url.includes(`${STORAGE_PUBLIC_SEGMENT}${bucket}/${folder}/`);
}

function isHttpUrl(value) {
  return value.startsWith('http://') || value.startsWith('https://');
}

function extensionFromContentType(contentType) {
  if (!contentType) return 'jpg';
  const normalized = contentType.toLowerCase();
  if (normalized.includes('image/png')) return 'png';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/gif')) return 'gif';
  return 'jpg';
}

async function migrateOne(supabase, row, bucket, folder) {
  const imageUrl = row.image?.trim();
  if (!imageUrl || isAlreadyMigrated(imageUrl, bucket, folder)) {
    return { status: 'skipped' };
  }
  if (!isHttpUrl(imageUrl)) {
    return { status: 'skipped' };
  }

  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'FanGround/1.0' },
    cache: 'no-store',
  });
  if (!response.ok) {
    return { status: 'failed', reason: `fetch failed (${response.status})` };
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    return { status: 'failed', reason: 'empty response body' };
  }

  const fileHash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const extension = extensionFromContentType(response.headers.get('content-type'));
  const objectPath = `${folder}/${row.google_sub}-${fileHash}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: response.headers.get('content-type') ?? `image/${extension}`,
    upsert: true,
    cacheControl: '31536000',
  });
  if (uploadError) {
    return { status: 'failed', reason: `upload failed (${uploadError.message})` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const newUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ image: newUrl })
    .eq('google_sub', row.google_sub);
  if (updateError) {
    return { status: 'failed', reason: `db update failed (${updateError.message})` };
  }

  return { status: 'migrated', newUrl };
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const profilePicturesBucket = process.env.SUPABASE_PROFILE_PICS_BUCKET || 'profile';
  const profilePicturesFolder = process.env.SUPABASE_PROFILE_PICS_FOLDER || 'profile';

  if (!supabaseUrl || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    throw new Error(`Failed to list buckets: ${bucketsError.message}`);
  }
  if (!(buckets ?? []).some((bucket) => bucket.name === profilePicturesBucket)) {
    throw new Error(
      `Bucket "${profilePicturesBucket}" not found. Available buckets: ${(buckets ?? [])
        .map((bucket) => bucket.name)
        .join(', ')}`,
    );
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('google_sub,image')
    .not('image', 'is', null)
    .order('google_sub', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = profiles ?? [];
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const result = await migrateOne(supabase, row, profilePicturesBucket, profilePicturesFolder);
    if (result.status === 'migrated') {
      migrated += 1;
      console.log(`migrated ${row.google_sub} -> ${result.newUrl}`);
    } else if (result.status === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
      console.warn(`failed ${row.google_sub}: ${result.reason}`);
    }
  }

  console.log(`done: total=${rows.length} migrated=${migrated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
