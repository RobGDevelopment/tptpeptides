import type { ClinicLandingContent } from '../schemas/clinicLanding';

export function resolveNavBrandName(content: ClinicLandingContent): string {
  return content.navBrandName?.trim() || content.wordmark;
}

export function isClinicLandingDirty(
  draft: ClinicLandingContent,
  published: ClinicLandingContent
): boolean {
  return JSON.stringify(draft) !== JSON.stringify(published);
}
