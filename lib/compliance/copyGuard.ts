/** RUO copy validation for customer-facing and product description fields. */

export const RUO_SUFFIX =
  ' For laboratory research purposes only. Not for human or veterinary use.';

const HIGH_RISK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bfor human use\b/i, label: 'for human use' },
  { pattern: /\btake daily\b/i, label: 'take daily' },
  { pattern: /\bdosage\b/i, label: 'dosage' },
  { pattern: /\binject\b/i, label: 'inject' },
  { pattern: /\bingest\b/i, label: 'ingest' },
  { pattern: /\bcure\b/i, label: 'cure' },
  { pattern: /\btreatment\b/i, label: 'treatment' },
  { pattern: /\bpain relief\b/i, label: 'pain relief' },
  { pattern: /\bweight loss\b/i, label: 'weight loss' },
  { pattern: /\bfat burner\b/i, label: 'fat burner' },
  { pattern: /\banti-aging\b/i, label: 'anti-aging' },
  { pattern: /\bbefore\/after\b/i, label: 'before/after' },
  { pattern: /\bgut health\b/i, label: 'gut health' },
  { pattern: /\bskin quality\b/i, label: 'skin quality' },
];

export function findComplianceViolations(text: string): string[] {
  return HIGH_RISK_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

export function hasRuOSuffix(text: string): boolean {
  return /for laboratory research purposes only/i.test(text);
}

/** Append standard RUO suffix when missing (product descriptions). */
export function ensureRuOSuffix(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return RUO_SUFFIX.trim();
  if (hasRuOSuffix(trimmed)) return trimmed;
  const base = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  return `${base}.${RUO_SUFFIX}`;
}

export function assertRuOProductDescription(text: string): {
  sanitized: string;
  violations: string[];
} {
  const violations = findComplianceViolations(text);
  return {
    sanitized: ensureRuOSuffix(text),
    violations,
  };
}
