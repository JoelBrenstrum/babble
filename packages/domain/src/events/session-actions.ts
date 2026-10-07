import type { BabyEvent, Side, TimedSegment } from './types';

export type SessionAction =
  | { kind: 'switch'; side: Side }
  | { kind: 'pause' }
  | { kind: 'resume'; side?: Side }
  | { kind: 'end' }
  | { kind: 'set-start'; startedAt: string };

export function applySessionAction(event: BabyEvent, action: SessionAction, now: Date): BabyEvent {
  if (event.endedAt !== null) return event;
  const at = now.toISOString();

  if (action.kind === 'set-start') {
    if (startChangeError(event, action.startedAt, now)) return event;
    if (event.type !== 'breast_feed' && event.type !== 'pump') return { ...event, startedAt: action.startedAt };
    const [first, ...rest] = event.segments;
    return {
      ...event,
      startedAt: action.startedAt,
      segments: first ? [{ ...first, startedAt: action.startedAt }, ...rest] : event.segments,
    };
  }

  if (event.type === 'sleep') {
    return action.kind === 'end' ? { ...event, endedAt: at, sessionState: 'ended' } : event;
  }
  if (event.type !== 'breast_feed' && event.type !== 'pump') return event;

  const closeOpen = (segments: TimedSegment[]) =>
    segments.map((segment) => (segment.endedAt === null ? { ...segment, endedAt: at } : segment));
  const open = event.segments.find((segment) => segment.endedAt === null);
  const last = event.segments.at(-1);

  switch (action.kind) {
    case 'switch':
      if (open?.side === action.side) return event;
      return {
        ...event,
        sessionState: 'running',
        segments: [...closeOpen(event.segments), { side: action.side, startedAt: at, endedAt: null }],
      };
    case 'pause':
      return { ...event, sessionState: 'paused', segments: closeOpen(event.segments) };
    case 'resume':
      if (open) return event;
      return {
        ...event,
        sessionState: 'running',
        segments: [...event.segments, { side: action.side ?? last?.side ?? 'left', startedAt: at, endedAt: null }],
      };
    case 'end': {
      const segments = closeOpen(event.segments);
      const lastEnd = segments.reduce<string | null>(
        (latest, segment) => (segment.endedAt && (!latest || segment.endedAt > latest) ? segment.endedAt : latest),
        null,
      );
      return { ...event, sessionState: 'ended', segments, endedAt: lastEnd ?? at };
    }
  }
}

export function startChangeError(event: BabyEvent, startedAt: string, now: Date): string | null {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 'Pick a start time.';
  if (start > now.getTime()) return "The start can't be in the future.";
  if (event.type !== 'breast_feed' && event.type !== 'pump') return null;
  const first = event.segments[0];
  if (!first) return null;
  const firstEnd = first.endedAt ? Date.parse(first.endedAt) : now.getTime();
  if (start >= firstEnd) return 'The start must be before the first side ended.';
  return null;
}

export const EARLIER_START_OPTIONS_MIN = [5, 10, 15] as const;

export function earlierStart(event: Pick<BabyEvent, 'startedAt'>, minutes: number): string {
  return new Date(Date.parse(event.startedAt) - minutes * 60_000).toISOString();
}

export const DISCARD_CONFIRM_AFTER_MS = 60_000;

export function discardNeedsConfirmation(event: Pick<BabyEvent, 'startedAt'>, now: Date): boolean {
  return now.getTime() - Date.parse(event.startedAt) >= DISCARD_CONFIRM_AFTER_MS;
}

export function sessionNoun(type: BabyEvent['type']): string {
  if (type === 'sleep') return 'nap';
  if (type === 'pump') return 'pump';
  return 'feed';
}
