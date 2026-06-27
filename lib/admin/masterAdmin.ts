import 'server-only';

/** Hardcoded master admins — server-only; never import from client components. */
export const MASTER_ADMIN_EMAILS = ['rjg.cal@gmail.com'] as const;

const masterAdminEmailSet = new Set(
  MASTER_ADMIN_EMAILS.map((email) => email.trim().toLowerCase())
);

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return masterAdminEmailSet.has(email.trim().toLowerCase());
}
