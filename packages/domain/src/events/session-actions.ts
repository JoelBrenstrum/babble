import type { BabyEvent, Side, TimedSegment } from './types';

export type SessionAction =
  { kind: 'switch'; side: Side } | { kind: 'pause' } | { kind: 'resume'; side?: Side } | { kind: 'end' };

export function applySessionAction(event: BabyEvent, action: SessionAction, now: Date): BabyEvent {
  if (event.endedAt !== null) return event;
  const at = now.toISOString();

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
