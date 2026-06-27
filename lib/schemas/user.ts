import { z } from 'zod';

/** Platform roles — `customer` is legacy and normalized to `user`. */
export const userRoleSchema = z.enum(['admin', 'partner', 'staff', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const ROLE_ACCESS_LEVELS: Record<UserRole, number> = {
  admin: 100,
  partner: 50,
  staff: 10,
  user: 0,
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Super Admin',
  partner: 'Partner',
  staff: 'Staff',
  user: 'Customer',
};

/** Maps legacy `customer` and unknown values to the canonical role. */
export function normalizeUserRole(role: string | undefined | null): UserRole {
  if (role === 'customer' || role == null || role === '') return 'user';
  if (userRoleSchema.safeParse(role).success) return role as UserRole;
  return 'user';
}

export function accessLevelForRole(role: UserRole): number {
  return ROLE_ACCESS_LEVELS[role];
}

export const userDocumentSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  accessLevel: z.number().int().min(0).max(100),
  disabled: z.boolean().default(false),
  lastActive: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  loyaltyPoints: z.number().optional(),
  totalPointsEarned: z.number().optional(),
  institutionVerified: z.boolean().optional(),
  institutionTier: z.enum(['Bronze', 'Silver', 'Gold']).optional(),
});

export type UserDocument = z.infer<typeof userDocumentSchema>;

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'partner', 'staff']),
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
