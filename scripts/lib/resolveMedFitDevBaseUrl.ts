/**
 * Resolve the local MedFit dev server base URL.
 * Port 3000 is often occupied by another Next app on this machine.
 */
export async function resolveMedFitDevBaseUrl(): Promise<string | null> {
  const configured = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  for (const port of [3001, 3000, 3002]) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) continue;
      const body = (await response.json()) as { adminSdkConfigured?: boolean };
      if (body.adminSdkConfigured) {
        return `http://localhost:${port}`;
      }
    } catch {
      // try next port
    }
  }

  return null;
}
