export type TrackerKey = 'breast_feed' | 'sleep' | 'nappy' | 'bottle' | 'pump' | 'growth' | 'custom';

export interface Tracker {
  key: TrackerKey;
  label: string;
  pluralLabel: string;
  icon: 'heart' | 'moon' | 'droplets' | 'milk' | 'glass-water' | 'ruler' | 'sparkles';
  token: 'feed-right' | 'sleep' | 'nappy' | 'bottle' | 'pump' | 'growth' | 'custom';
}

export const TRACKERS: readonly Tracker[] = [
  { key: 'breast_feed', label: 'Breastfeed', pluralLabel: 'Breastfeeds', icon: 'heart', token: 'feed-right' },
  { key: 'sleep', label: 'Sleep', pluralLabel: 'Sleep', icon: 'moon', token: 'sleep' },
  { key: 'nappy', label: 'Nappy', pluralLabel: 'Nappies', icon: 'droplets', token: 'nappy' },
  { key: 'bottle', label: 'Bottle', pluralLabel: 'Bottles', icon: 'milk', token: 'bottle' },
  { key: 'pump', label: 'Pump', pluralLabel: 'Pumping', icon: 'glass-water', token: 'pump' },
  { key: 'growth', label: 'Growth', pluralLabel: 'Growth', icon: 'ruler', token: 'growth' },
  { key: 'custom', label: 'Custom', pluralLabel: 'Custom events', icon: 'sparkles', token: 'custom' },
];

export const EVENT_TYPES = TRACKERS.map((tracker) => tracker.key);

export function isEventType(value: string): value is TrackerKey {
  return (EVENT_TYPES as string[]).includes(value);
}

export function trackerFor(type: TrackerKey): Tracker {
  return TRACKERS.find((tracker) => tracker.key === type)!;
}

export const SESSION_TYPES = ['breast_feed', 'pump', 'sleep'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export function isSessionType(type: TrackerKey): type is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(type);
}

export function listTypesFor(type: TrackerKey, filter: 'all' | 'breast' | 'bottle' = 'all'): TrackerKey[] {
  if (type !== 'breast_feed' && type !== 'bottle') return [type];
  if (filter === 'breast') return ['breast_feed'];
  if (filter === 'bottle') return ['bottle'];
  return ['breast_feed', 'bottle'];
}
