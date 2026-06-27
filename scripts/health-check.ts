/**
 * Lightweight production health probe — run without Playwright:
 *   npx tsx scripts/health-check.ts
 *   SMOKE_BASE_URL=https://medfit-pro.vercel.app npx tsx scripts/health-check.ts
 */

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'https://medfit-pro.vercel.app').replace(/\/$/, '');

type CheckResult = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

async function check(
  name: string,
  path: string,
  options?: { method?: string; expectStatus?: number | number[]; body?: unknown; retries?: number },
): Promise<CheckResult> {
  const url = `${baseUrl}${path}`;
  const expectStatus = options?.expectStatus ?? 200;
  const retries = options?.retries ?? 1;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      const statuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
      const ok = statuses.includes(response.status);
      let detail: string | undefined;

      if (!ok) {
        detail = (await response.text()).slice(0, 200);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1_000));
          continue;
        }
      } else if (path.includes('/api/')) {
        try {
          const json = (await response.clone().json()) as Record<string, unknown>;
          detail = JSON.stringify(json).slice(0, 120);
        } catch {
          detail = `status ${response.status}`;
        }
      }

      return { name, url, ok, status: response.status, detail };
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        continue;
      }
      return {
        name,
        url,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { name, url, ok: false, detail: 'unreachable' };
}

async function main() {
  const checkDefs: Array<
    [string, string, { method?: string; expectStatus?: number | number[]; body?: unknown; retries?: number }?]
  > = [
    ['Home page', '/'],
    ['Health diagnostic', '/api/health', { expectStatus: [200, 404] }],
    ['Catalog page', '/catalog'],
    ['Admin page', '/admin'],
    ['Products API', '/api/products'],
    [
      'Products stock API',
      '/api/products/stock',
      { method: 'POST', body: { ids: ['5-amino-1mq-60mg'] }, expectStatus: 200, retries: 3 },
    ],
    ['Session admin-status (anonymous)', '/api/session/admin-status', { retries: 3 }],
    [
      'Session sync validation',
      '/api/session/sync',
      { method: 'POST', body: {}, expectStatus: 400, retries: 3 },
    ],
    [
      'Admin users API (unauthenticated)',
      '/api/admin/users',
      { expectStatus: [401, 403, 503], retries: 3 },
    ],
  ];

  const checks: CheckResult[] = [];
  for (const [name, path, options] of checkDefs) {
    checks.push(await check(name, path, options));
  }

  const failed = checks.filter((c) => !c.ok);

  console.log(`\nMedFit health check — ${baseUrl}\n`);
  for (const result of checks) {
    const icon = result.ok ? '✓' : '✗';
    const status = result.status !== undefined ? ` [${result.status}]` : '';
    console.log(`${icon} ${result.name}${status}`);
    if (result.detail) {
      console.log(`  ${result.detail}`);
    }
  }

  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
