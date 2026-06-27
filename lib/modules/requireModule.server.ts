import 'server-only';

import type { UserRole } from '../schemas/user';
import type { ModuleFlagKey, ModuleFlags } from '../schemas/modules';
import { isModuleEnabled } from './flags';

export class ModuleDisabledError extends Error {
  readonly statusCode = 404;
  readonly moduleKey: ModuleFlagKey;

  constructor(moduleKey: ModuleFlagKey) {
    super(`Module "${moduleKey}" is not enabled`);
    this.name = 'ModuleDisabledError';
    this.moduleKey = moduleKey;
  }
}

export class RoleForbiddenError extends Error {
  readonly statusCode = 403;
  readonly requiredRoles: UserRole[];
  readonly actualRole: UserRole;

  constructor(actualRole: UserRole, requiredRoles: UserRole[]) {
    super(
      `Role "${actualRole}" is not authorized. Required: ${requiredRoles.join(' or ')}.`
    );
    this.name = 'RoleForbiddenError';
    this.actualRole = actualRole;
    this.requiredRoles = requiredRoles;
  }
}

/** Throws when the requested module flag is off — use in API routes. */
export function requireModule(flags: ModuleFlags, key: ModuleFlagKey): void {
  if (!isModuleEnabled(flags, key)) {
    throw new ModuleDisabledError(key);
  }
}

/** Throws when the user's role is not in the allowed set. */
export function requireRole(role: UserRole, required: UserRole | UserRole[]): void {
  const allowed = Array.isArray(required) ? required : [required];
  if (!allowed.includes(role)) {
    throw new RoleForbiddenError(role, allowed);
  }
}

export class AccessLevelForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(actual: number, minimum: number) {
    super(`Access level ${actual} is below required minimum ${minimum}.`);
    this.name = 'AccessLevelForbiddenError';
  }
}

/** Throws when access level is below the minimum threshold. */
export function requireMinAccessLevel(accessLevel: number, minimum: number): void {
  if (accessLevel < minimum) {
    throw new AccessLevelForbiddenError(accessLevel, minimum);
  }
}

export interface RequireModuleAccessOptions {
  role?: UserRole;
  requiredRole?: UserRole | UserRole[];
  minAccessLevel?: number;
  accessLevel?: number;
}

/** Module gate with optional role / access-level checks. */
export function requireModuleAccess(
  flags: ModuleFlags,
  key: ModuleFlagKey,
  options?: RequireModuleAccessOptions
): void {
  requireModule(flags, key);

  if (options?.role != null && options.requiredRole != null) {
    requireRole(options.role, options.requiredRole);
  }

  if (options?.minAccessLevel != null && options.accessLevel != null) {
    requireMinAccessLevel(options.accessLevel, options.minAccessLevel);
  }
}
