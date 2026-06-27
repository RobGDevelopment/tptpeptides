import { test, expect } from '@playwright/test';
import { ensureAgeVerified, passAgeGate } from './helpers/ageGate';

const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

test.describe('Admin storefront @smoke', () => {
  test.skip(!adminEmail || !adminPassword, 'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run');

  test('storefront CMS loads settings for authenticated admin', async ({ page }) => {
    await ensureAgeVerified(page);
    await page.goto('/');

    await passAgeGate(page);

    await page.getByRole('button', { name: /sign in|log in|account/i }).first().click().catch(() => {});
    const emailInput = page.getByLabel(/email/i);
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(adminEmail!);
      await page.getByLabel(/password/i).fill(adminPassword!);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
    }

    await page.goto('/admin/storefront');
    await expect(page.getByText(/Storefront CMS/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Unable to load storefront settings/i)).toHaveCount(0);
    await expect(page.getByLabel(/Headline|hero title/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
