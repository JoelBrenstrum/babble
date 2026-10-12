export type Feature =
  | 'core_tracking'
  | 'history'
  | 'reminders'
  | 'huckleberry_import'
  | 'stats'
  | 'multiple_babies'
  | 'extra_carers'
  | 'predictions';

export type Plan = 'free' | 'plus';

export const ALL_FEATURES: readonly Feature[] = [
  'core_tracking',
  'history',
  'reminders',
  'huckleberry_import',
  'stats',
  'multiple_babies',
  'extra_carers',
  'predictions',
];

const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  free: ['core_tracking', 'history', 'reminders', 'huckleberry_import', 'stats'],
  plus: ALL_FEATURES,
};

export function entitlements(options: { billingEnabled: boolean; plan: Plan }): ReadonlySet<Feature> {
  return new Set(options.billingEnabled ? PLAN_FEATURES[options.plan] : ALL_FEATURES);
}

export function familyHasFeature(billingEnabled: boolean, familyPlan: string, feature: Feature): boolean {
  return entitlements({ billingEnabled, plan: familyPlan === 'plus' ? 'plus' : 'free' }).has(feature);
}

const PLUS_HIGHLIGHTS: string[] = [
  'Predicted sleeps and feeds on Home and the Timeline',
  'More than one baby in a family',
  'More than two carers in a family',
];

export type PlusFeature = 'predictions' | 'multiple_babies' | 'extra_carers';

const PLUS_REASONS: Record<PlusFeature, string> = {
  predictions: 'Predicted sleeps and feeds are part of Babble Plus.',
  multiple_babies: 'Adding more than one baby to a family is part of Babble Plus.',
  extra_carers: 'A free family can have two carers, counting invites waiting to be accepted. Babble Plus allows more.',
};

export interface PlusPitch {
  reason: string;
  highlights: string[];
  note: string;
}

export function plusPitch(feature: PlusFeature): PlusPitch {
  return { reason: PLUS_REASONS[feature], highlights: PLUS_HIGHLIGHTS, note: 'Upgrading is coming soon.' };
}

export function canAddBaby(billingEnabled: boolean, familyPlan: string, babyCount: number): boolean {
  return babyCount === 0 || familyHasFeature(billingEnabled, familyPlan, 'multiple_babies');
}

export interface PlanSummary {
  plus: boolean;
  status: string;
  highlights: string[];
}

export function planSummary(billingEnabled: boolean, familyPlan: string): PlanSummary | null {
  if (!billingEnabled) return null;
  return familyPlan === 'plus'
    ? { plus: true, status: 'Your family has Plus. Everyone in the family gets it.', highlights: PLUS_HIGHLIGHTS }
    : { plus: false, status: "You're on the free plan. Upgrading is coming soon.", highlights: PLUS_HIGHLIGHTS };
}

export const FREE_CARER_LIMIT = 2;

export function canInviteCarer(
  billingEnabled: boolean,
  familyPlan: string,
  carers: number,
  pendingInvites: number,
): boolean {
  return carers + pendingInvites < FREE_CARER_LIMIT || familyHasFeature(billingEnabled, familyPlan, 'extra_carers');
}
