import 'server-only';

import type { ModuleFlags } from '../schemas/modules';
import type { UserRbacProfile } from '../firebase/users.server';
import { isModuleEnabled } from './flags';
import {
  adminRouteForbiddenMessage,
  hasAdminPortalRole,
  isRouteAllowedForRole,
} from './rbac';

export class AdminRouteForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminRouteForbiddenError';
  }
}

export function assertAdminRouteAccess(
  profile: UserRbacProfile,
  pathname: string,
  flags: ModuleFlags
): void {
  const rbacEnabled = isModuleEnabled(flags, 'isGranularRbacEnabled');

  if (!hasAdminPortalRole(profile.role)) {
    throw new AdminRouteForbiddenError('Admin portal access required.');
  }

  if (!isRouteAllowedForRole(pathname, profile.role, rbacEnabled)) {
    throw new AdminRouteForbiddenError(adminRouteForbiddenMessage(profile.role));
  }
}
