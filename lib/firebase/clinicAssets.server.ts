import 'server-only';

import { getAdminStorage, getAdminStorageBucketName, isAdminSdkConfigured } from './admin';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 48 * 1024 * 1024;

export type ClinicMarketingAssetKind = 'image' | 'video';

function resolveAssetKind(mimeType: string): ClinicMarketingAssetKind | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return 'image';
  if (VIDEO_MIME_TYPES.has(mimeType)) return 'video';
  return null;
}

export async function uploadClinicMarketingAsset(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ publicUrl: string; storagePath: string; kind: ClinicMarketingAssetKind }> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Storage is not configured.');
  }

  const kind = resolveAssetKind(params.mimeType);
  if (!kind) {
    throw new Error('Unsupported file type. Upload JPG, PNG, WebP, MP4, or WebM.');
  }

  const maxBytes = kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (params.buffer.byteLength > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      kind === 'video'
        ? `Video exceeds ${limitMb} MB limit. Compress the loop or paste a hosted URL for larger 8K files.`
        : `Image exceeds ${limitMb} MB limit.`
    );
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const folder = kind === 'video' ? 'clinic_assets/landing/video' : 'clinic_assets/landing';
  const storagePath = `${folder}/${Date.now()}_${safeName}`;

  const bucket = getAdminStorage().bucket(getAdminStorageBucketName());
  const file = bucket.file(storagePath);

  await file.save(params.buffer, {
    metadata: {
      contentType: params.mimeType,
      metadata: {
        purpose: 'clinic_landing',
        kind,
      },
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { publicUrl, storagePath, kind };
}

/** @deprecated Use uploadClinicMarketingAsset */
export async function uploadClinicMarketingImage(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const result = await uploadClinicMarketingAsset(params);
  return { publicUrl: result.publicUrl, storagePath: result.storagePath };
}
