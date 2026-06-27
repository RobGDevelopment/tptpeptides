import 'server-only';

import { getAdminStorage, getAdminStorageBucketName, isAdminSdkConfigured } from './admin';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadVerificationDocument(params: {
  userId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ storagePath: string }> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Storage is not configured');
  }

  if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
    throw new Error('Unsupported file type. Upload PDF, JPG, or PNG.');
  }

  if (params.buffer.byteLength > MAX_BYTES) {
    throw new Error('File exceeds 10 MB limit');
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `verification_docs/${params.userId}/${Date.now()}_${safeName}`;

  const bucket = getAdminStorage().bucket(getAdminStorageBucketName());
  const file = bucket.file(storagePath);

  await file.save(params.buffer, {
    metadata: {
      contentType: params.mimeType,
      metadata: {
        userId: params.userId,
        purpose: 'institution_verification',
      },
    },
  });

  return { storagePath };
}
