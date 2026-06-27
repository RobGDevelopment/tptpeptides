export async function logAgeVerification(userId?: string): Promise<void> {
  try {
    await fetch('/api/compliance/age-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId ?? 'anonymous',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      }),
    });
  } catch (error) {
    console.warn('Age verification audit log failed:', error);
  }
}
