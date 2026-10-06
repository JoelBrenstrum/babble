export type Feature = 'core_tracking' | 'history' | 'reminders' | 'huckleberry_import' | 'stats' | 'multiple_babies';

export type Plan = 'free' | 'plus';

export const ALL_FEATURES: readonly Feature[] = [
  'core_tracking',
  'history',
  'reminders',
  'huckleberry_import',
  'stats',
  'multiple_babies',
];

const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  free: ['core_tracking', 'history', 'reminders', 'huckleberry_import'],
  plus: ALL_FEATURES,
};

export function entitlements(options: { billingEnabled: boolean; plan: Plan }): ReadonlySet<Feature> {
  return new Set(options.billingEnabled ? PLAN_FEATURES[options.plan] : ALL_FEATURES);
}
