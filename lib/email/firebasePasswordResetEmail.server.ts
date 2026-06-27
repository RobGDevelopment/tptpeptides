import 'server-only';

/** Sends Firebase Auth password-reset email (works to any registered user — no Resend domain needed). */
export async function sendFirebasePasswordResetEmail(
  email: string,
  continueUrl: string
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not configured');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email.trim().toLowerCase(),
        continueUrl,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error('[email] Firebase sendOobCode failed', response.status, body);
    throw new Error(
      `Firebase password email failed (${response.status}). Check Firebase Auth email templates and authorized domains.`
    );
  }
}
