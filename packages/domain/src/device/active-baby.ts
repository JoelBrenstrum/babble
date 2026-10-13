export interface ActiveBabySelection {
  familyId: string | null;
  babyId: string | null;
}

const isIdOrNull = (value: unknown): value is string | null => value === null || typeof value === 'string';

export function parseActiveBaby(value: string | null): ActiveBabySelection | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { familyId, babyId } = parsed as Record<string, unknown>;
    return isIdOrNull(familyId) && isIdOrNull(babyId) ? { familyId, babyId } : null;
  } catch {
    return null;
  }
}
