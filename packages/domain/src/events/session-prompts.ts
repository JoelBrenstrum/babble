import { MINUTE_MS } from '../time/constants';
import { ms } from '../time/instants';
import type { BabyEvent, EventType, Side } from './types';

export type NapPrompt =
  | { kind: 'end-nap'; nap: BabyEvent; feedStartedAt: string }
  | { kind: 'start-nap'; feedEndedAt: string }
  | { kind: 'end-feed'; feed: BabyEvent; napStartedAt: string }
  | { kind: 'nappy'; at: string };

export const NAPPY_PROMPT_SKIP_MS = 30 * MINUTE_MS;

export type NappyPromptTiming = 'feed_start' | 'first_side' | 'feed_end' | 'off';

export const NAPPY_PROMPT_LABELS: Record<NappyPromptTiming, string> = {
  feed_start: 'When a feed starts',
  first_side: 'After the first side',
  feed_end: 'When the feed ends',
  off: "Don't ask",
};

export const NAPPY_PROMPT_OPTIONS: { value: NappyPromptTiming; label: string }[] = (
  ['feed_start', 'first_side', 'feed_end', 'off'] as const
).map((value) => ({ value, label: NAPPY_PROMPT_LABELS[value] }));

const isOpenNap = (event: BabyEvent) => event.type === 'sleep' && event.endedAt === null;
const isOpenFeed = (event: BabyEvent) => event.type === 'breast_feed' && event.endedAt === null;

export function napPromptOnFeedStart(running: readonly BabyEvent[], feedStartedAt: string): NapPrompt | null {
  const nap = running.find(isOpenNap);
  return nap ? { kind: 'end-nap', nap, feedStartedAt } : null;
}

export function napPromptOnFeedEnd(running: readonly BabyEvent[], feedEndedAt: string): NapPrompt | null {
  return running.some(isOpenNap) ? null : { kind: 'start-nap', feedEndedAt };
}

export function feedPromptOnNapStart(running: readonly BabyEvent[], napStartedAt: string): NapPrompt | null {
  const feed = running.find(isOpenFeed);
  return feed ? { kind: 'end-feed', feed, napStartedAt } : null;
}

function nappyPrompt(events: readonly BabyEvent[], at: string): NapPrompt | null {
  const moment = ms(at);
  const recent = events.some(
    (event) =>
      event.type === 'nappy' && !event.deletedAt && Math.abs(moment - ms(event.startedAt)) < NAPPY_PROMPT_SKIP_MS,
  );
  return recent ? null : { kind: 'nappy', at };
}

function onlySide(feed: BabyEvent): Side | null {
  if (feed.type !== 'breast_feed') return null;
  const sides = new Set(feed.segments.map((segment) => segment.side));
  return sides.size === 1 ? [...sides][0]! : null;
}

export function nappyPromptOnFeedStart(
  timing: NappyPromptTiming,
  events: readonly BabyEvent[],
  at: string,
): NapPrompt | null {
  return timing === 'feed_start' ? nappyPrompt(events, at) : null;
}

export function nappyPromptOnSideChange(
  timing: NappyPromptTiming,
  feed: BabyEvent,
  nextSide: Side,
  events: readonly BabyEvent[],
  at: string,
): NapPrompt | null {
  const first = onlySide(feed);
  return timing === 'first_side' && first !== null && first !== nextSide ? nappyPrompt(events, at) : null;
}

export function nappyPromptOnFeedFinish(
  timing: NappyPromptTiming,
  feed: BabyEvent,
  events: readonly BabyEvent[],
  at: string,
): NapPrompt | null {
  if (timing === 'feed_end') return nappyPrompt(events, at);
  return timing === 'first_side' && onlySide(feed) !== null ? nappyPrompt(events, at) : null;
}

export function nappyPromptAfterBottle(
  timing: NappyPromptTiming,
  events: readonly BabyEvent[],
  at: string,
): NapPrompt | null {
  return timing === 'off' ? null : nappyPrompt(events, at);
}

interface PromptContext {
  running: readonly BabyEvent[];
  latest: readonly BabyEvent[];
  nappyTiming: NappyPromptTiming;
  at: string;
}

export type SessionPromptRequest =
  | (PromptContext & { kind: 'start'; event: { type: EventType } })
  | (PromptContext & { kind: 'side'; event: BabyEvent; side: Side })
  | (PromptContext & { kind: 'end'; event: BabyEvent });

export function promptsForSessionEvent(request: SessionPromptRequest): NapPrompt[] {
  const { running, latest, nappyTiming, at } = request;
  const prompts: (NapPrompt | null)[] = [];
  switch (request.kind) {
    case 'start':
      if (request.event.type === 'breast_feed') {
        prompts.push(napPromptOnFeedStart(running, at), nappyPromptOnFeedStart(nappyTiming, latest, at));
      } else if (request.event.type === 'sleep') {
        prompts.push(feedPromptOnNapStart(running, at));
      } else if (request.event.type === 'bottle') {
        prompts.push(
          napPromptOnFeedStart(running, at) ?? napPromptOnFeedEnd(running, at),
          nappyPromptAfterBottle(nappyTiming, latest, at),
        );
      }
      break;
    case 'side':
      if (request.event.type === 'breast_feed') {
        prompts.push(nappyPromptOnSideChange(nappyTiming, request.event, request.side, latest, at));
      }
      break;
    case 'end':
      if (request.event.type === 'breast_feed') {
        prompts.push(napPromptOnFeedEnd(running, at), nappyPromptOnFeedFinish(nappyTiming, request.event, latest, at));
      }
      break;
  }
  return prompts.filter((prompt): prompt is NapPrompt => prompt !== null);
}
