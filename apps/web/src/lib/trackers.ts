import type { EventType } from '@babble/domain';
import { TRACKERS } from '@babble/domain';

export const EVENT_TYPES = TRACKERS.map((tracker) => tracker.key) as EventType[];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as string[]).includes(value);
}

export function trackerFor(type: EventType) {
  return TRACKERS.find((tracker) => tracker.key === type)!;
}

export const SESSION_TYPES = ['breast_feed', 'pump', 'sleep'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export function isSessionType(type: EventType): type is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(type);
}

export function listTypesFor(type: EventType, filter: 'all' | 'breast' | 'bottle' = 'all'): EventType[] {
  if (type !== 'breast_feed' && type !== 'bottle') return [type];
  if (filter === 'breast') return ['breast_feed'];
  if (filter === 'bottle') return ['bottle'];
  return ['breast_feed', 'bottle'];
}
