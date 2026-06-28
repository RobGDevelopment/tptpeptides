import 'server-only';

export class CronAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronAuthError';
  }
}

export function assertCronAuthorized(request: Request): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new CronAuthError('CRON_SECRET is not configured');
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== secret) {
    throw new CronAuthError('Unauthorized cron request');
  }
}
