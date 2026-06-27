'use client';

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { app } from './firebaseConfig';

let appCheckInitialized = false;

/**
 * Initializes Firebase App Check on the client in production only.
 * Requires NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY and App Check enabled in Firebase Console.
 */
export function initFirebaseClient(): void {
  if (typeof window === 'undefined' || appCheckInitialized) return;
  if (process.env.NODE_ENV !== 'production') return;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey) {
    console.warn('[Firebase] App Check skipped — NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY not set');
    return;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  appCheckInitialized = true;
}
