import { DAY_MS, MINUTE_MS } from '../time/constants';
import { byStartedAtAsc, compareIso } from '../time/instants';
import { shiftLocalDays } from '../time/local-time';
import { hasSegments, lastSegmentEnd, mapSegments } from './segments';
import type { BabyEvent, EventOfType, Side, Stretch } from './types';

export type SessionAction =
  | { kind: 'switch'; side: Side }
  | { kind: 'pause' }
  | { kind: 'resume'; side?: Side }
  | { kind: 'end'; at?: string }
  | { kind: 'set-start'; startedAt: string }
  | { kind: 'set-switch'; at: string };

export function applySessionAction(event: BabyEvent, action: SessionAction, now: Date): BabyEvent {
  if (event.endedAt !== null) return event;
  const at = now.toISOString();

  if (action.kind === 'set-start') {
    if (startChangeError(event, action.startedAt, now)) return event;
    return mapSegments({ ...event, startedAt: action.startedAt }, (segments) => {
      const [first, ...rest] = segments;
      return first ? [{ ...first, startedAt: action.startedAt }, ...rest] : segments;
    });
  }

  if (action.kind === 'set-switch') {
    if (switchChangeError(event, action.at, now)) return event;
    return mapSegments(event, (segments) => {
      const ordered = [...segments].sort(byStartedAtAsc);
      const previous = ordered.at(-2);
      const latest = ordered.at(-1);
      return ordered.map((segment) => {
        if (segment === latest) return { ...segment, startedAt: action.at };
        if (segment === previous && segment.endedAt && compareIso(segment.endedAt, action.at) > 0) {
          return { ...segment, endedAt: action.at };
        }
        return segment;
      });
    });
  }

  const closeOpen = <S extends Stretch>(segments: S[], closeAt = at): S[] =>
    segments.map((segment) =>
      segment.endedAt === null
        ? { ...segment, endedAt: compareIso(closeAt, segment.startedAt) > 0 ? closeAt : segment.startedAt }
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
      return { ...event, sessionState: 'ended', segments, endedAt: settledEnd(segments) ?? endAt(action, at) };
    }
  }
}

function settledEnd(segments: readonly Stretch[]): string | null {
  const end = lastSegmentEnd({ segments });
  return end === null ? null : new Date(end).toISOString();
}

function applyNapAction(
  nap: EventOfType<'sleep'>,
  action: Exclude<SessionAction, { kind: 'set-start' } | { kind: 'set-switch' }>,
  at: string,
  closeOpen: (segments: Stretch[], closeAt?: string) => Stretch[],
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
      const end = endAt(action, at);
      const segments = closeOpen(nap.segments, end).map((segment) =>
        segment.endedAt && compareIso(segment.endedAt, end) > 0
          ? { ...segment, endedAt: compareIso(segment.startedAt, end) > 0 ? segment.startedAt : end }
          : segment,
      );
      return { ...nap, sessionState: 'ended', segments, endedAt: settledEnd(segments) ?? end };
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
  if (!hasSegments(event)) return null;
  const first = event.segments[0];
  if (!first) return null;
  const firstEnd = first.endedAt ? Date.parse(first.endedAt) : now.getTime();
  if (start >= firstEnd) return 'The start must be before the first side ended.';
  return null;
}

// Just after midnight the picker still shows today's date, so 11:45 pm means last night, not tonight.
export function pickedPastTime(iso: string, now: Date, timeZone?: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at) || at <= now.getTime()) return iso;
  const yesterday = timeZone ? shiftLocalDays(iso, -1, timeZone) : new Date(at - DAY_MS).toISOString();
  return Date.parse(yesterday) > now.getTime() ? iso : yesterday;
}

export const EARLIER_START_OPTIONS_MIN = [5, 10, 15] as const;

export function earlierStart(event: Pick<BabyEvent, 'startedAt'>, minutes: number): string {
  return new Date(Date.parse(event.startedAt) - minutes * MINUTE_MS).toISOString();
}

export const EARLIER_END_OPTIONS_MIN = [5, 10, 15, 30] as const;

export function earlierEnd(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * MINUTE_MS).toISOString();
}

export function suggestedEnd(event: BabyEvent, now: Date): string {
  const pausedAt = event.type === 'sleep' ? event.segments.at(-1)?.endedAt : null;
  if (pausedAt) return pausedAt;
  const earliest = earliestEnd(event);
  const fiveAgo = earlierEnd(now, 5);
  return Date.parse(earliest) > Date.parse(fiveAgo) ? earliest : fiveAgo;
}

export function earliestEnd(event: BabyEvent): string {
  if (!hasSegments(event)) return event.startedAt;
  const last = event.segments.at(-1);
  if (!last) return event.startedAt;
  if (event.type === 'sleep') return last.startedAt;
  return last.endedAt ?? last.startedAt;
}

export function endChangeError(event: BabyEvent, endedAt: string, now: Date): string | null {
  const end = Date.parse(endedAt);
  if (Number.isNaN(end)) return 'Pick an end time.';
  if (end > now.getTime()) return "The end can't be in the future.";
  if (end >= Date.parse(earliestEnd(event))) return null;
  if (event.type === 'sleep') {
    return event.segments.length > 1
      ? "The end can't be before the nap resumed."
      : "The end can't be before the nap started.";
  }
  const last = hasSegments(event) ? event.segments.at(-1) : undefined;
  if (last && last.endedAt === null) return "The end can't be before the current side started.";
  if (last) return "The end can't be before the last side finished.";
  return `The end can't be before the ${sessionNoun(event.type)} started.`;
}

export function canMoveSwitch(event: BabyEvent): boolean {
  return hasSegments(event) && event.endedAt === null && event.segments.length >= 2;
}

export function switchChangeError(event: BabyEvent, switchAt: string, now: Date): string | null {
  if (!hasSegments(event) || !canMoveSwitch(event)) return "There's no switch to move yet.";
  const at = Date.parse(switchAt);
  if (Number.isNaN(at)) return 'Pick a time.';
  if (at > now.getTime()) return "The switch can't be in the future.";
  const ordered = [...event.segments].sort(byStartedAtAsc);
  if (at >= Date.parse(ordered.at(-1)!.startedAt)) return 'Pick a time before the switch.';
  if (at <= Date.parse(ordered.at(-2)!.startedAt)) return 'The switch must be after the previous side started.';
  return null;
}

export const IDLE_TRIM_STEP_MS = MINUTE_MS;

export function trimIdleSwitch(event: BabyEvent, now: Date): string | null {
  if (!hasSegments(event) || !canMoveSwitch(event)) return null;
  const ordered = [...event.segments].sort(byStartedAtAsc);
  const previousEnd = ordered.at(-2)!.endedAt;
  const latestStart = Date.parse(ordered.at(-1)!.startedAt);
  if (!previousEnd || Date.parse(previousEnd) >= latestStart) return null;
  const at = new Date(Math.max(Date.parse(previousEnd), latestStart - IDLE_TRIM_STEP_MS)).toISOString();
  return switchChangeError(event, at, now) ? null : at;
}

export const DISCARD_CONFIRM_AFTER_MS = MINUTE_MS;

export function discardNeedsConfirmation(event: Pick<BabyEvent, 'startedAt'>, now: Date): boolean {
  return now.getTime() - Date.parse(event.startedAt) >= DISCARD_CONFIRM_AFTER_MS;
}

export function sessionNoun(type: BabyEvent['type']): string {
  if (type === 'sleep') return 'nap';
  if (type === 'pump') return 'pump';
  return 'feed';
}
