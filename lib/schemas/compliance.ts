import { z } from 'zod';

/** US state / territory codes blocked at checkout when geo module is on. */
export const complianceSettingsSchema = z.object({
  restrictedStates: z.array(z.string().length(2)).default([]),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type ComplianceSettings = z.infer<typeof complianceSettingsSchema>;

export const complianceSettingsPatchSchema = z.object({
  restrictedStates: z.array(z.string().length(2)),
});

export type ComplianceSettingsPatch = z.infer<typeof complianceSettingsPatchSchema>;

/** Default restricted jurisdictions — empty until admin configures. */
export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  restrictedStates: [],
};
