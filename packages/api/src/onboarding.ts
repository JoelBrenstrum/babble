import type { BabyRow, Family } from './types';

export type OnboardingStep =
  | { step: 'sign-in' }
  | { step: 'family' }
  | { step: 'baby'; family: Family }
  | { step: 'ready'; family: Family; baby: BabyRow };

export function resolveOnboarding(options: {
  signedIn: boolean;
  families: Family[];
  activeFamilyId?: string | null;
  activeBabyId?: string | null;
}): OnboardingStep {
  if (!options.signedIn) return { step: 'sign-in' };
  if (options.families.length === 0) return { step: 'family' };

  const family = options.families.find((f) => f.id === options.activeFamilyId) ?? pickDefaultFamily(options.families);
  const baby = family.babies.find((b) => b.id === options.activeBabyId) ?? family.babies[0];
  if (!baby) return { step: 'baby', family };
  return { step: 'ready', family, baby };
}

function pickDefaultFamily(families: Family[]): Family {
  return families.find((family) => family.babies.length > 0) ?? families[0]!;
}

export function memberRole(family: Family, userId: string) {
  return family.members.find((member) => member.user_id === userId)?.role ?? null;
}

export function canEdit(family: Family, userId: string): boolean {
  const role = memberRole(family, userId);
  return role === 'owner' || role === 'caregiver';
}

export function canRenameMember(family: Family, userId: string, memberId: string): boolean {
  return userId === memberId || memberRole(family, userId) === 'owner';
}

export function canRemoveMember(family: Family, userId: string, memberId: string): boolean {
  return userId !== memberId && memberRole(family, userId) === 'owner' && memberRole(family, memberId) !== null;
}

export const MAX_MEMBER_NAME = 60;

export function memberNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name.';
  return trimmed.length > MAX_MEMBER_NAME ? `Keep it under ${MAX_MEMBER_NAME} characters.` : null;
}

export interface BabyChoice {
  baby: BabyRow;
  familyId: string;
  familyName: string;
}

export function babyChoices(families: Family[]): BabyChoice[] {
  return families.flatMap((family) =>
    [...family.babies]
      .sort((a, b) => a.birth_date.localeCompare(b.birth_date) || a.name.localeCompare(b.name))
      .map((baby) => ({ baby, familyId: family.id, familyName: family.name })),
  );
}
