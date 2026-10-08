import { trackerFor, type Tracker } from '../trackers';
import { sessionNoun } from './session-actions';
import type { BabyEvent } from './types';

export interface RunningIndicator {
  tokens: Tracker['token'][];
  pulsing: boolean;
  label: string;
}

export function runningIndicator(running: readonly BabyEvent[]): RunningIndicator | null {
  const open = running.filter((event) => event.endedAt === null);
  if (open.length === 0) return null;
  const tokens = [...new Set(open.map((event) => trackerFor(event.type).token))].slice(0, 2);
  const nouns = [...new Set(open.map((event) => runningNoun(event.type)))];
  const allPaused = open.every((event) => event.sessionState === 'paused');
  return {
    tokens,
    pulsing: !allPaused,
    label: `${capitalise(joinNouns(nouns))} ${allPaused ? 'paused' : 'running'}`,
  };
}

function runningNoun(type: BabyEvent['type']): string {
  if (type === 'breast_feed' || type === 'pump' || type === 'sleep') return sessionNoun(type);
  return trackerFor(type).label.toLowerCase();
}

function joinNouns(nouns: string[]): string {
  if (nouns.length <= 1) return nouns.join('');
  return `${nouns.slice(0, -1).join(', ')} and ${nouns.at(-1)}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
