import { z } from 'zod';
import { institutionTierSchema, adminStaffRoleSchema } from './user';

export const invitePersonaSchema = z.enum([
  'super_admin',
  'staff_partner',
  'lab_buyer',
  'first_purchase',
]);

export type InvitePersona = z.infer<typeof invitePersonaSchema>;

export const inviteStatusSchema = z.enum(['sent', 'pending', 'failed']);

export type InviteStatus = z.infer<typeof inviteStatusSchema>;

export const INVITE_PERSONA_LABELS: Record<
  InvitePersona,
  { label: string; description: string }
> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full back-office access — catalog, CMS, modules, users.',
  },
  staff_partner: {
    label: 'Staff / Partner',
    description: 'Team member with role-based admin access.',
  },
  lab_buyer: {
    label: 'Institution / Lab Buyer',
    description: 'B2B account with institutional tier and verification path.',
  },
  first_purchase: {
    label: 'First-Time Researcher',
    description: 'Standard client portal — browse catalog and place first order.',
  },
};

export const adminUserInviteSchema = z
  .object({
    email: z.string().email(),
    persona: invitePersonaSchema,
    role: adminStaffRoleSchema.optional(),
    institutionTier: institutionTierSchema.optional(),
    institutionName: z.string().max(200).optional(),
    personalNote: z.string().max(500).optional(),
    siteUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.persona === 'staff_partner' && !data.role) {
      ctx.addIssue({
        code: 'custom',
        message: 'Role is required for staff/partner invites',
        path: ['role'],
      });
    }
  });

export type AdminUserInviteInput = z.infer<typeof adminUserInviteSchema>;

/** Relaxed schema for live admin preview (no provisioning). */
export const invitePreviewSchema = z.object({
  email: z.string().max(320).optional(),
  persona: invitePersonaSchema,
  role: adminStaffRoleSchema.optional(),
  institutionTier: institutionTierSchema.optional(),
  institutionName: z.string().max(200).optional(),
  personalNote: z.string().max(500).optional(),
  siteUrl: z.string().url().optional(),
});

export type InvitePreviewInput = z.infer<typeof invitePreviewSchema>;

export const invitationRecordSchema = z.object({
  email: z.string().email(),
  persona: invitePersonaSchema,
  status: inviteStatusSchema,
  targetUid: z.string(),
  invitedBy: z.string(),
  invitedAt: z.string(),
  resendMessageId: z.string().optional(),
  error: z.string().optional(),
  institutionTier: institutionTierSchema.optional(),
  institutionName: z.string().optional(),
  personalNote: z.string().optional(),
});

export type InvitationRecord = z.infer<typeof invitationRecordSchema>;
