import 'server-only';

import { getAdminStorage, getAdminStorageBucketName, isAdminSdkConfigured } from './admin';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadClinicMarketingImage(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ publicUrl: string; storagePath: string }> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Storage is not configured.');
  }

  if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
    throw new Error('Unsupported image type. Upload JPG, PNG, or WebP.');
  }

  if (params.buffer.byteLength > MAX_BYTES) {
    throw new Error('Image exceeds 5 MB limit.');
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `clinic_assets/landing/${Date.now()}_${safeName}`;

  const bucket = getAdminStorage().bucket(getAdminStorageBucketName());
  const file = bucket.file(storagePath);

  await file.save(params.buffer, {
    metadata: {
      contentType: params.mimeType,
      metadata: {
        purpose: 'clinic_landing',
      },
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { publicUrl, storagePath };
}
