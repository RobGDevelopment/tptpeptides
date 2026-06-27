import { test, expect } from '@playwright/test';
import { ensureAgeVerified, passAgeGate } from './helpers/ageGate';

function attachIssueCollectors(page: import('@playwright/test').Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 500 && url.includes('/api/')) {
      failedRequests.push(`${status} ${url}`);
    }
  });

  return { consoleErrors, failedRequests };
}

test.describe('Public pages @smoke', () => {
  test('home loads after age gate', async ({ page }) => {
    const { consoleErrors, failedRequests } = attachIssueCollectors(page);

    await ensureAgeVerified(page);
    await page.goto('/');
    await passAgeGate(page);

    await expect(page.getByRole('heading', { name: /Research Inventory/i })).toBeVisible({
      timeout: 15_000,
    });

    expect(failedRequests, `Server errors:\n${failedRequests.join('\n')}`).toEqual([]);
    expect(
      consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404')),
      `Console errors:\n${consoleErrors.join('\n')}`,
    ).toEqual([]);
  });

  test('catalog and legal pages respond', async ({ page }) => {
    await ensureAgeVerified(page);
    await page.goto('/catalog');
    await passAgeGate(page);
    await expect(page.getByRole('heading', { name: /Full Research Catalog/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/terms');
    await expect(page.locator('body')).toContainText(/terms|conditions|research/i);
  });
});

test.describe('Admin shell @smoke', () => {
  test('/admin serves HTML and redirects unauthenticated users', async ({ page }) => {
    const { failedRequests } = attachIssueCollectors(page);

    const response = await page.goto('/admin');
    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveURL(/\/?(\?redirect=admin)?$/, { timeout: 15_000 });

    const adminStatusFailures = failedRequests.filter((entry) =>
      entry.includes('/api/session/admin-status'),
    );
    expect(
      adminStatusFailures,
      `admin-status should not 500:\n${adminStatusFailures.join('\n')}`,
    ).toEqual([]);
  });
});
