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
