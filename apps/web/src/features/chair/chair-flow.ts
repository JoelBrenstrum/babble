import { CHAIR_ENDED_MS, type ChairFeed } from '@babble/domain';
import type { EndedFeed } from './ended-view';

export type ChairSheet = 'bottle' | 'nappy' | 'nappy-ask' | 'baby';
export interface ChairToast {
  key: number;
  message: string;
  undo?: () => Promise<unknown>;
}

export interface ChairFlowState {
  sheet: ChairSheet | null;
  toast: ChairToast | null;
  toastKey: number;
  ended: EndedFeed | null;
  now: number;
}

export type ChairFlowEvent =
  | { type: 'open-sheet'; sheet: ChairSheet }
  | { type: 'close-sheet' }
  | { type: 'toast'; message: string; undo?: () => Promise<unknown> }
  | { type: 'dismiss-toast' }
  | { type: 'feed-ended'; feed: Pick<ChairFeed, 'id' | 'summary'>; now: number; askNappy: boolean }
  | { type: 'clear-ended' }
  | { type: 'tick'; now: number };

export const initialChairFlow: ChairFlowState = { sheet: null, toast: null, toastKey: 0, ended: null, now: 0 };

export function chairFlowReducer(state: ChairFlowState, event: ChairFlowEvent): ChairFlowState {
  switch (event.type) {
    case 'open-sheet':
      return { ...state, sheet: event.sheet };
    case 'close-sheet':
      return { ...state, sheet: null };
    case 'toast': {
      const key = state.toastKey + 1;
      return { ...state, toastKey: key, toast: { key, message: event.message, undo: event.undo } };
    }
    case 'dismiss-toast':
      return { ...state, toast: null };
    case 'feed-ended':
      return {
        ...state,
        now: event.now,
        sheet: event.askNappy ? 'nappy-ask' : state.sheet,
        ended: { id: event.feed.id, ...event.feed.summary, until: event.now + CHAIR_ENDED_MS },
      };
    case 'clear-ended':
      return { ...state, ended: null };
    case 'tick':
      if (!state.ended) return state;
      return event.now >= state.ended.until ? { ...state, ended: null } : { ...state, now: event.now };
  }
}

export function chairErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'Something went wrong. Try again.';
}
