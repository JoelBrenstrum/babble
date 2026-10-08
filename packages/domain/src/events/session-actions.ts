import type { BabyEvent, EventOfType, Side, SleepStretch } from './types';

export type SessionAction =
  | { kind: 'switch'; side: Side }
  | { kind: 'pause' }
  | { kind: 'resume'; side?: Side }
  | { kind: 'end'; at?: string }
  | { kind: 'set-start'; startedAt: string };

export function applySessionAction(event: BabyEvent, action: SessionAction, now: Date): BabyEvent {
  if (event.endedAt !== null) return event;
  const at = now.toISOString();

  if (action.kind === 'set-start') {
    if (startChangeError(event, action.startedAt, now)) return event;
    if (event.type !== 'breast_feed' && event.type !== 'pump' && event.type !== 'sleep') {
      return { ...event, startedAt: action.startedAt };
    }
    const [first, ...rest] = event.segments;
    if (!first) return { ...event, startedAt: action.startedAt };
    return {
      ...event,
      startedAt: action.startedAt,
      segments: [{ ...first, startedAt: action.startedAt }, ...rest],
    } as BabyEvent;
  }

  const closeOpen = <S extends SleepStretch>(segments: S[], closeAt = at): S[] =>
    segments.map((segment) =>
      segment.endedAt === null
        ? { ...segment, endedAt: Date.parse(closeAt) > Date.parse(segment.startedAt) ? closeAt : segment.startedAt }
        : segment,
    );
  if (event.type === 'sleep') return applyNapAction(event, action, at, closeOpen);
  if (event.type !== 'breast_feed' && event.type !== 'pump') return event;

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
      const segments = closeOpen(event.segments, endAt(action, at));
      return { ...event, sessionState: 'ended', segments, endedAt: latestEnd(segments) ?? endAt(action, at) };
    }
  }
}

function latestEnd(segments: readonly SleepStretch[]): string | null {
  return segments.reduce<string | null>(
    (latest, segment) =>
      segment.endedAt && (!latest || Date.parse(segment.endedAt) > Date.parse(latest)) ? segment.endedAt : latest,
    null,
  );
}

function applyNapAction(
  nap: EventOfType<'sleep'>,
  action: Exclude<SessionAction, { kind: 'set-start' }>,
  at: string,
  closeOpen: (segments: SleepStretch[], closeAt?: string) => SleepStretch[],
): BabyEvent {
  const open = nap.segments.some((segment) => segment.endedAt === null);
  switch (action.kind) {
    case 'pause':
      if (nap.segments.length === 0) {
        return { ...nap, sessionState: 'paused', segments: [{ startedAt: nap.startedAt, endedAt: at }] };
      }
      return { ...nap, sessionState: 'paused', segments: closeOpen(nap.segments) };
    case 'resume':
      if (open || nap.segments.length === 0) return nap;
      return { ...nap, sessionState: 'running', segments: [...nap.segments, { startedAt: at, endedAt: null }] };
    case 'end': {
      const segments = closeOpen(nap.segments, endAt(action, at));
      return { ...nap, sessionState: 'ended', segments, endedAt: latestEnd(segments) ?? endAt(action, at) };
    }
    case 'switch':
      return nap;
  }
}

function endAt(action: { at?: string }, now: string): string {
  return action.at && Date.parse(action.at) < Date.parse(now) ? action.at : now;
}

export function startChangeError(event: BabyEvent, startedAt: string, now: Date): string | null {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 'Pick a start time.';
  if (start > now.getTime()) return "The start can't be in the future.";
  if (event.type !== 'breast_feed' && event.type !== 'pump' && event.type !== 'sleep') return null;
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

export const EARLIER_END_OPTIONS_MIN = [5, 10, 15, 30] as const;

export function earlierEnd(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function suggestedEnd(event: BabyEvent, now: Date): string {
  const earliest = earliestEnd(event);
  const fiveAgo = earlierEnd(now, 5);
  return Date.parse(earliest) > Date.parse(fiveAgo) ? earliest : fiveAgo;
}

export function earliestEnd(event: BabyEvent): string {
  if (event.type !== 'breast_feed' && event.type !== 'pump' && event.type !== 'sleep') return event.startedAt;
  const last = event.segments.at(-1);
  if (!last) return event.startedAt;
  return last.endedAt ?? last.startedAt;
}

export function endChangeError(event: BabyEvent, endedAt: string, now: Date): string | null {
  const end = Date.parse(endedAt);
  if (Number.isNaN(end)) return 'Pick an end time.';
  if (end > now.getTime()) return "The end can't be in the future.";
  if (end >= Date.parse(earliestEnd(event))) return null;
  const last =
    event.type === 'breast_feed' || event.type === 'pump' || event.type === 'sleep' ? event.segments.at(-1) : undefined;
  const nap = event.type === 'sleep';
  if (last && last.endedAt === null) {
    return nap ? "The end can't be before the nap resumed." : "The end can't be before the current side started.";
  }
  if (last)
    return nap ? "The end can't be before the nap was paused." : "The end can't be before the last side finished.";
  return `The end can't be before the ${sessionNoun(event.type)} started.`;
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
