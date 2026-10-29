export const PLANS = ['free', 'plus'] as const;

export type Plan = (typeof PLANS)[number];

export function toPlan(value: string): Plan {
  return value === 'plus' ? 'plus' : 'free';
}

export const ALL_FEATURES = [
  'core_tracking',
  'history',
  'reminders',
  'huckleberry_import',
  'stats',
  'reports',
  'multiple_babies',
  'extra_carers',
  'predictions',
  'insights',
  'chair_mode',
  'unlimited_reports',
] as const;

export type Feature = (typeof ALL_FEATURES)[number];

const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  free: ['core_tracking', 'history', 'reminders', 'huckleberry_import', 'stats', 'reports'],
  plus: ALL_FEATURES,
};

export function entitlements(options: { billingEnabled: boolean; plan: Plan }): ReadonlySet<Feature> {
  return new Set(options.billingEnabled ? PLAN_FEATURES[options.plan] : ALL_FEATURES);
}

export function familyHasFeature(billingEnabled: boolean, familyPlan: string, feature: Feature): boolean {
  return entitlements({ billingEnabled, plan: toPlan(familyPlan) }).has(feature);
}

export interface Entitlements {
  readonly plan: Plan;
  has(feature: Feature): boolean;
  canAddBaby(babyCount: number): boolean;
  canInviteCarer(carers: number, pendingInvites: number): boolean;
}

export function familyEntitlements(billingEnabled: boolean, familyPlan: string): Entitlements {
  const features = entitlements({ billingEnabled, plan: toPlan(familyPlan) });
  return {
    plan: toPlan(familyPlan),
    has: (feature) => features.has(feature),
    canAddBaby: (babyCount) => canAddBaby(billingEnabled, familyPlan, babyCount),
    canInviteCarer: (carers, pendingInvites) => canInviteCarer(billingEnabled, familyPlan, carers, pendingInvites),
  };
}

export const FREE_CARER_LIMIT = 2;

export const FREE_REPORT_LIMIT = 2;

export const REPORT_LIMIT_MESSAGE = 'A free family can save two reports. Babble Plus saves as many as you like.';

export function canSaveReport(billingEnabled: boolean, familyPlan: string, savedReports: number): boolean {
  return familyHasFeature(billingEnabled, familyPlan, 'unlimited_reports') || savedReports < FREE_REPORT_LIMIT;
}

export const CARER_LIMIT_MESSAGE =
  'A free family can have two carers, counting invites waiting to be accepted. Babble Plus allows more.';

const PLUS_HIGHLIGHTS: readonly string[] = [
  'Sleep windows and predicted feeds on Home and the Timeline',
  "An estimate of today's weight, length and head size",
  'More than one baby in a family',
  'More than two carers in a family',
  'Wake windows, night sleep, a weekly summary and all-time stats',
  'Breastfeed trends: time per feed, per side and idle',
  'Feed spacing: how far apart feeds are, day and night',
  'Cluster feeding: when feeds bunch up, and what time of day',
  'A 30-day timeline to see patterns form',
  'Chair mode, a feed station for a tablet by the feeding chair',
  'Unlimited saved reports and reports over 90 days, 6 months or all time',
];

export type PlusFeature =
  | 'predictions'
  | 'multiple_babies'
  | 'extra_carers'
  | 'insights'
  | 'chair_mode'
  | 'unlimited_reports';

const PLUS_REASONS: Record<PlusFeature, string> = {
  predictions: 'Sleep windows and predicted feeds are part of Babble Plus.',
  multiple_babies: 'Adding more than one baby to a family is part of Babble Plus.',
  extra_carers: CARER_LIMIT_MESSAGE,
  insights:
    'Wake windows, night sleep trends, breastfeed trends, feed spacing, cluster feeding, the weekly summary, all-time stats and the 30-day timeline are part of Babble Plus.',
  chair_mode: 'Chair mode is part of Babble Plus. You can preview it from Settings.',
  unlimited_reports: REPORT_LIMIT_MESSAGE,
};

export interface PlusPitch {
  reason: string;
  readonly highlights: readonly string[];
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
  readonly highlights: readonly string[];
}

export function planSummary(billingEnabled: boolean, familyPlan: string): PlanSummary | null {
  if (!billingEnabled) return null;
  return familyPlan === 'plus'
    ? { plus: true, status: 'Your family has Plus. Everyone in the family gets it.', highlights: PLUS_HIGHLIGHTS }
    : { plus: false, status: "You're on the free plan. Upgrading is coming soon.", highlights: PLUS_HIGHLIGHTS };
}

export function canInviteCarer(
  billingEnabled: boolean,
  familyPlan: string,
  carers: number,
  pendingInvites: number,
): boolean {
  return carers + pendingInvites < FREE_CARER_LIMIT || familyHasFeature(billingEnabled, familyPlan, 'extra_carers');
}
