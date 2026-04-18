/**
 * Resize trophy art for on-screen use (cards ~88px CSS; 256px covers 2–3x DPR)
 * and encode as WebP. Run: node scripts/optimize-trophies.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'public', 'trophies');

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jpg'));

if (files.length === 0) {
  console.log('No .jpg files in public/trophies — nothing to do.');
  process.exit(0);
}

for (const f of files) {
  const input = path.join(dir, f);
  const outName = f.replace(/\.jpg$/i, '.webp');
  const output = path.join(dir, outName);

  await sharp(input)
    .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 92, effort: 6 })
    .toFile(output);

  const inStat = fs.statSync(input);
  const outStat = fs.statSync(output);
  fs.unlinkSync(input);
  console.log(`${f} → ${outName}  ${(inStat.size / 1024).toFixed(0)}KB → ${(outStat.size / 1024).toFixed(0)}KB`);
}
