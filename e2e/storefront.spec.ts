import { test, expect } from '@playwright/test';
import { ensureAgeVerified, passAgeGate } from './helpers/ageGate';

test('storefront catalog journey @smoke', async ({ page }) => {
  await ensureAgeVerified(page);
  await page.goto('/');
  await passAgeGate(page);

  await expect(page.getByRole('heading', { name: /Research Inventory/i })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('link', { name: /Browse Full Catalog/i }).click();
  await expect(page).toHaveURL(/\/catalog/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Full Research Catalog/i })).toBeVisible();

  const productLink = page.locator('a[href^="/catalog/"]').first();
  await productLink.click();
  await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();
});
