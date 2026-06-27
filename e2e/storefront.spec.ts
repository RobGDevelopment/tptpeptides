import { test, expect } from '@playwright/test';

test('storefront catalog journey', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Age Verification/i })).toBeVisible();
  await page.getByRole('button', { name: /I Agree/i }).click();

  await expect(page.getByRole('heading', { name: /Research Inventory/i })).toBeVisible();

  await page.getByRole('link', { name: /Browse Full Catalog/i }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole('heading', { name: /Full Research Catalog/i })).toBeVisible();

  const productLink = page.locator('a[href^="/catalog/"]').first();
  await productLink.click();
  await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();
});
