import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const AGE_GATE_STORAGE_KEY = 'tpt-age-verified';

/** Pre-seed age verification before navigation (avoids zustand hydration races in E2E). */
export async function bypassAgeGate(page: Page) {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ state: { isVerified: true }, version: 0 }),
    );
  }, AGE_GATE_STORAGE_KEY);
}

/** Click through the age gate when it is shown. No-op if already verified. */
export async function passAgeGate(page: Page) {
  const agree = page.getByRole('button', { name: /I Agree/i });
  if (!(await agree.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return;
  }

  await expect(agree).toBeEnabled({ timeout: 30_000 });
  await agree.click();
  await expect(agree).toBeHidden({ timeout: 10_000 });
}

export async function ensureAgeVerified(page: Page) {
  await bypassAgeGate(page);
}
