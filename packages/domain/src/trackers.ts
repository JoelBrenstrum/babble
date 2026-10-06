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
