import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requireEnv(
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: requireEnv(
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

async function initAnalyticsSafely(firebaseApp: FirebaseApp): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!measurementId) return;

  // Analytics triggers Installations + remote config fetches — skip in local dev to avoid noisy errors
  if (process.env.NODE_ENV === 'development') return;

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (supported) {
      getAnalytics(firebaseApp);
    }
  } catch (error) {
    console.warn('[Firebase] Analytics initialization skipped.', error);
  }
}

if (typeof window !== 'undefined') {
  void initAnalyticsSafely(app).catch((error) => {
    console.warn('[Firebase] Analytics initialization failed.', error);
  });
}
