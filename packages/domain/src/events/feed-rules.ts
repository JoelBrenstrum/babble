import { formatTimeOfDay } from '../time/local-time';
import type { BabyEvent } from './types';

export function latestFeed(events: readonly BabyEvent[]): BabyEvent | undefined {
  return events
    .filter((event) => (event.type === 'breast_feed' || event.type === 'bottle') && !event.deletedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
}

export function canResumeFeed(
  event: BabyEvent,
  latestFeedId: string | undefined,
  running: readonly BabyEvent[],
): boolean {
  if (event.type !== 'breast_feed' || event.endedAt === null || event.deletedAt) return false;
  if (event.id !== latestFeedId) return false;
  return !running.some((item) => item.type === 'breast_feed' && item.id !== event.id);
}

export function staleSessions(running: readonly BabyEvent[], now: Date, autoEndMinutes: number): BabyEvent[] {
  const limit = autoEndMinutes * 60_000;
  return running.filter((event) => {
    if (event.type !== 'breast_feed' && event.type !== 'pump') return false;
    if (event.segments.some((segment) => segment.endedAt === null)) return false;
    const lastEnd = event.segments.reduce(
      (latest, segment) => Math.max(latest, segment.endedAt ? Date.parse(segment.endedAt) : 0),
      Date.parse(event.startedAt),
    );
    return now.getTime() - lastEnd >= limit;
  });
}

export type NapPrompt =
  { kind: 'end-nap'; nap: BabyEvent; feedStartedAt: string } | { kind: 'start-nap'; feedEndedAt: string };

export function napPromptOnFeedStart(running: readonly BabyEvent[], feedStartedAt: string): NapPrompt | null {
  const nap = running.find((event) => event.type === 'sleep' && event.endedAt === null);
  return nap ? { kind: 'end-nap', nap, feedStartedAt } : null;
}

export function napPromptOnFeedEnd(running: readonly BabyEvent[], feedEndedAt: string): NapPrompt | null {
  const napRunning = running.some((event) => event.type === 'sleep' && event.endedAt === null);
  return napRunning ? null : { kind: 'start-nap', feedEndedAt };
}

export type NapAction = { kind: 'end-nap'; napId: string; at?: string } | { kind: 'start-nap'; at?: string } | null;

export interface NapPromptOption {
  label: string;
  action: NapAction;
  primary: boolean;
}

export interface NapPromptContent {
  title: string;
  body: string;
  options: NapPromptOption[];
}

export function napPromptContent(prompt: NapPrompt, babyName: string, timeZone: string, now: Date): NapPromptContent {
  if (prompt.kind === 'end-nap') {
    const startedJustNow = now.getTime() - Date.parse(prompt.feedStartedAt) < 2 * 60_000;
    return {
      title: `End ${babyName}'s nap?`,
      body: `A nap has been running since ${formatTimeOfDay(prompt.nap.startedAt, timeZone)}.`,
      options: [
        { label: 'End nap now', action: { kind: 'end-nap', napId: prompt.nap.id }, primary: true },
        ...(startedJustNow
          ? []
          : [
              {
                label: `End at feed start (${formatTimeOfDay(prompt.feedStartedAt, timeZone)})`,
                action: { kind: 'end-nap', napId: prompt.nap.id, at: prompt.feedStartedAt } as NapAction,
                primary: false,
              },
            ]),
        { label: 'Keep sleeping', action: null, primary: false },
      ],
    };
  }
  return {
    title: `Is ${babyName} asleep?`,
    body: 'Start a nap so the timer is already running when they wake.',
    options: [
      { label: 'Start nap now', action: { kind: 'start-nap' }, primary: true },
      {
        label: `Asleep since feed end (${formatTimeOfDay(prompt.feedEndedAt, timeZone)})`,
        action: { kind: 'start-nap', at: prompt.feedEndedAt },
        primary: false,
      },
      { label: 'Not now', action: null, primary: false },
    ],
  };
}
