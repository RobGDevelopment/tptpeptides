import { spawnSync } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'https://medfit-pro.vercel.app';

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['playwright', 'test', '--grep', '@smoke'],
  {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    shell: process.platform === 'win32',
  },
);

process.exit(result.status ?? 1);
