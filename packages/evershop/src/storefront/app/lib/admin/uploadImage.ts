import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { CONSTANTS } from '../../../../lib/helpers.js';

const UPLOAD_SUBDIR = 'uploads';
/** Long-edge cap — "HD, max 1080p" per the storage-size goal. `fit: 'inside'` never upscales past the source. */
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

/**
 * Local-disk image pipeline: resize to fit within `MAX_DIMENSION` on the
 * long edge (never upscales — `withoutEnlargement`), convert to WebP, write
 * under `CONSTANTS.MEDIAPATH/uploads/`. That directory is already served
 * statically at `/assets/*` by `lib/middlewares/static.ts` — no new
 * static-serving route needed, just write the file and hand back its path.
 *
 * WebP at q82 plus the dimension cap is what actually keeps storage low —
 * far more than a storage *backend* choice would. A 4000×3000 JPEG product
 * photo (~3–5MB) becomes a ≤1920px WebP typically under 200KB.
 */
export async function processAndSaveImage(file: File): Promise<{ url: string; width: number; height: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadDir = path.join(CONSTANTS.MEDIAPATH, UPLOAD_SUBDIR);
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const destPath = path.join(uploadDir, filename);

  const info = await sharp(buffer)
    .rotate() // apply EXIF orientation before resizing, then strip metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(destPath);

  return { url: `/assets/${UPLOAD_SUBDIR}/${filename}`, width: info.width, height: info.height };
}
