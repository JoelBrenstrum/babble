import { MINUTE_MS } from '../time/constants';
import { ms } from '../time/instants';
import { formatTimeOfDay } from '../time/local-time';
import type { NapPrompt } from './session-prompts';

// Within this window, "now" and the feed's own start/end time are effectively the same choice.
const SAME_MOMENT_MS = 2 * MINUTE_MS;

export type NapAction =
  | { kind: 'end-nap'; napId: string; at?: string }
  | { kind: 'start-nap'; at?: string }
  | { kind: 'end-feed'; feedId: string; at?: string }
  | { kind: 'log-nappy' }
  | null;

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

const isJustNow = (iso: string, now: Date) => now.getTime() - ms(iso) < SAME_MOMENT_MS;

const dismiss = (label: string): NapPromptOption => ({ label, action: null, primary: false });

function alsoAtEarlierTime(iso: string, now: Date, option: (time: string) => NapPromptOption): NapPromptOption[] {
  return isJustNow(iso, now) ? [] : [option(iso)];
}

export function napPromptContent(prompt: NapPrompt, babyName: string, timeZone: string, now: Date): NapPromptContent {
  const time = (iso: string) => formatTimeOfDay(iso, timeZone);
  switch (prompt.kind) {
    case 'nappy':
      return {
        title: `Change ${babyName}'s nappy?`,
        body: 'Log a nappy change with this feed.',
        options: [{ label: 'Yes, log a nappy', action: { kind: 'log-nappy' }, primary: true }, dismiss('Not now')],
      };
    case 'end-feed': {
      const justNow = isJustNow(prompt.napStartedAt, now);
      return {
        title: `End ${babyName}'s feed?`,
        body: `A feed has been running since ${time(prompt.feed.startedAt)}.`,
        options: [
          {
            label: justNow ? 'End feed' : `End feed at nap start (${time(prompt.napStartedAt)})`,
            action: { kind: 'end-feed', feedId: prompt.feed.id, ...(justNow ? {} : { at: prompt.napStartedAt }) },
            primary: true,
          },
          dismiss('Keep feeding'),
        ],
      };
    }
    case 'end-nap':
      return {
        title: `End ${babyName}'s nap?`,
        body: `A nap has been running since ${time(prompt.nap.startedAt)}.`,
        options: [
          { label: 'End nap now', action: { kind: 'end-nap', napId: prompt.nap.id }, primary: true },
          ...alsoAtEarlierTime(prompt.feedStartedAt, now, (at) => ({
            label: `End at feed start (${time(at)})`,
            action: { kind: 'end-nap', napId: prompt.nap.id, at },
            primary: false,
          })),
          dismiss('Keep sleeping'),
        ],
      };
    case 'start-nap':
      return {
        title: `Is ${babyName} asleep?`,
        body: 'Start a nap so the timer is already running when they wake.',
        options: [
          { label: 'Start nap now', action: { kind: 'start-nap' }, primary: true },
          ...alsoAtEarlierTime(prompt.feedEndedAt, now, (at) => ({
            label: `Asleep since feed end (${time(at)})`,
            action: { kind: 'start-nap', at },
            primary: false,
          })),
          dismiss('Not now'),
        ],
      };
  }
}
