export async function logAgeVerification(params: {
  userId?: string;
  ageConfirmed: boolean;
}): Promise<void> {
  try {
    await fetch('/api/compliance/age-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId ?? 'anonymous',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        ageConfirmed: params.ageConfirmed,
        confirmationMethod: 'dropdown_21_plus',
      }),
    });
  } catch (error) {
    console.warn('Age verification audit log failed:', error);
  }
}
