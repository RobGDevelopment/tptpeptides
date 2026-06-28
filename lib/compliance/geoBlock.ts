/** Normalize US state codes for comparison. */
export function normalizeStateCode(state: string | null | undefined): string | null {
  if (!state?.trim()) return null;
  return state.trim().toUpperCase().slice(0, 2);
}

export function isStateRestricted(
  state: string | null | undefined,
  restrictedStates: string[]
): boolean {
  const normalized = normalizeStateCode(state);
  if (!normalized || restrictedStates.length === 0) return false;
  const blocked = new Set(restrictedStates.map((code) => code.toUpperCase()));
  return blocked.has(normalized);
}

export class GeoBlockedError extends Error {
  constructor(public state: string) {
    super(`Research compound shipments are not available to ${state}.`);
    this.name = 'GeoBlockedError';
  }
}

export function assertShippingAllowed(
  state: string | null | undefined,
  restrictedStates: string[]
): void {
  const normalized = normalizeStateCode(state);
  if (normalized && isStateRestricted(normalized, restrictedStates)) {
    throw new GeoBlockedError(normalized);
  }
}
