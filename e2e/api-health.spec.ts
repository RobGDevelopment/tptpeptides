import { test, expect } from '@playwright/test';

test.describe('API health @smoke', () => {
  test('GET /api/health reports admin SDK status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect([200, 404]).toContain(response.status());

    if (response.status() === 404) {
      test.skip(true, '/api/health not deployed yet');
    }

    const body = (await response.json()) as {
      adminSdkConfigured: boolean;
      adminSdkReady: boolean;
    };
    expect(typeof body.adminSdkConfigured).toBe('boolean');
    expect(typeof body.adminSdkReady).toBe('boolean');
  });

  test('GET /api/products returns 200 with products array', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status(), await response.text()).toBe(200);

    const body = (await response.json()) as { products?: unknown[] };
    expect(Array.isArray(body.products)).toBe(true);
  });

  test('POST /api/products/stock returns 200 for valid ids', async ({ request }) => {
    const productsResponse = await request.get('/api/products');
    const { products } = (await productsResponse.json()) as { products: { id: string }[] };
    expect(products.length).toBeGreaterThan(0);

    const response = await request.post('/api/products/stock', {
      data: { ids: [products[0].id] },
    });
    expect(response.status(), await response.text()).toBe(200);
  });

  test('GET /api/session/admin-status returns JSON for anonymous users', async ({ request }) => {
    const response = await request.get('/api/session/admin-status');
    expect(response.status(), await response.text()).toBe(200);

    const body = (await response.json()) as { isAdmin: boolean; isMasterAdmin: boolean };
    expect(body).toMatchObject({ isAdmin: false, isMasterAdmin: false });
  });

  test('POST /api/session/sync rejects missing idToken', async ({ request }) => {
    const response = await request.post('/api/session/sync', { data: {} });
    expect(response.status()).toBe(400);

    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/idToken/i);
  });

  test('GET /api/admin/users requires authentication', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThan(500);
  });
});
