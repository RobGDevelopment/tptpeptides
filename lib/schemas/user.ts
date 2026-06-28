import { z } from 'zod';

/** Canonical platform roles — `customer` is legacy and normalized to `user`. */
export const userRoleSchema = z.enum(['admin', 'ops', 'finance', 'sales', 'support', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Roles that may access the admin portal. */
export const ADMIN_PORTAL_ROLES: UserRole[] = ['admin', 'ops', 'finance', 'sales', 'support'];

export type AdminPortalRole = Exclude<UserRole, 'user'>;

export const ROLE_ACCESS_LEVELS: Record<UserRole, number> = {
  admin: 100,
  ops: 40,
  finance: 35,
  sales: 50,
  support: 30,
  user: 0,
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Super Admin',
  ops: 'Operations',
  finance: 'Finance',
  sales: 'Sales',
  support: 'Support',
  user: 'Customer',
};

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  partner: 'sales',
  staff: 'ops',
  customer: 'user',
};

/** Maps legacy `customer`, `partner`, `staff`, and unknown values to canonical roles. */
export function normalizeUserRole(role: string | undefined | null): UserRole {
  if (role == null || role === '') return 'user';
  const legacy = LEGACY_ROLE_MAP[role];
  if (legacy) return legacy;
  if (userRoleSchema.safeParse(role).success) return role as UserRole;
  return 'user';
}

export function accessLevelForRole(role: UserRole): number {
  return ROLE_ACCESS_LEVELS[role];
}

export function hasAdminPortalRole(role: UserRole): boolean {
  return ADMIN_PORTAL_ROLES.includes(role);
}

export const adminStaffRoleSchema = z.enum(['admin', 'ops', 'finance', 'sales', 'support']);
export type AdminStaffRole = z.infer<typeof adminStaffRoleSchema>;

export const userDocumentSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  accessLevel: z.number().int().min(0).max(100),
  disabled: z.boolean().default(false),
  lastActive: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  /** Reserved for Sprint A multi-tenant isolation */
  tenantId: z.string().nullable().optional(),
  loyaltyPoints: z.number().optional(),
  totalPointsEarned: z.number().optional(),
  institutionVerified: z.boolean().optional(),
  institutionTier: z.enum(['Bronze', 'Silver', 'Gold']).optional(),
  /** Sales tax exempt — valid resale / institution certificate on file */
  taxExempt: z.boolean().optional(),
});

export type UserDocument = z.infer<typeof userDocumentSchema>;

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  role: adminStaffRoleSchema,
});

export const adminUserUpdateSchema = z.object({
  uid: z.string().min(1),
  role: userRoleSchema.optional(),
  disabled: z.boolean().optional(),
});

export const institutionTierSchema = z.enum(['Bronze', 'Silver', 'Gold']);

export type InstitutionTier = z.infer<typeof institutionTierSchema>;

export const shippingAddressSchema = z.object({
  institution: z.string().min(1, 'Institution name is required'),
  labName: z.string().optional(),
  line1: z.string().min(1, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1).default('US'),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const userProfileUpdateSchema = z.object({
  shippingAddress: shippingAddressSchema.optional(),
  /** Only admin verification workflow may set this — ignored from client PATCH. */
  institutionVerified: z.boolean().optional(),
  institutionTier: institutionTierSchema.optional(),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
