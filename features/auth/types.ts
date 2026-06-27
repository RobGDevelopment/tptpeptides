export type { UserRole } from '../../lib/schemas/user';

import type { UserRole } from '../../lib/schemas/user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
