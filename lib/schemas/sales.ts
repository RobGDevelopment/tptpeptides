import { z } from 'zod';

export const aeRosterMemberSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  active: z.boolean().default(true),
});

export type AeRosterMember = z.infer<typeof aeRosterMemberSchema>;

export const salesSettingsSchema = z.object({
  aeRoster: z.array(aeRosterMemberSchema).default([]),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type SalesSettings = z.infer<typeof salesSettingsSchema>;

export const salesSettingsPatchSchema = z.object({
  aeRoster: z.array(aeRosterMemberSchema),
});

export type SalesSettingsPatch = z.infer<typeof salesSettingsPatchSchema>;

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  aeRoster: [],
};

export const leadRecordSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  companyDomain: z.string(),
  companyName: z.string().optional(),
  leadScore: z.number().int().min(0).max(100),
  assignedAeUid: z.string().nullable(),
  assignedAeEmail: z.string().email().nullable(),
  routedAt: z.string(),
});

export type LeadRecord = z.infer<typeof leadRecordSchema>;

export const marginSkuRowSchema = z.object({
  productId: z.string(),
  name: z.string(),
  tag: z.string(),
  unitsSold: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  cogs: z.number().nonnegative(),
  grossMargin: z.number(),
  marginPercent: z.number(),
});

export type MarginSkuRow = z.infer<typeof marginSkuRowSchema>;

export const marginReportSchema = z.object({
  orderCount: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  cogs: z.number().nonnegative(),
  grossMargin: z.number(),
  marginPercent: z.number(),
  skuRows: z.array(marginSkuRowSchema),
});

export type MarginReport = z.infer<typeof marginReportSchema>;

export interface InstitutionAccountRow {
  uid: string;
  email: string;
  institutionTier: string | null;
  institutionVerified: boolean;
  assignedAeEmail: string | null;
  leadScore: number | null;
  totalPointsEarned: number;
}
