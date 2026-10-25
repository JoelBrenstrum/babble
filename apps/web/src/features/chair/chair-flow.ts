import {
  CHAIR_ENDED_MS,
  SIZE_LABELS,
  WET_SIZE_LABELS,
  type ChairFeed,
  type ChairNappySizes,
  type NappyType,
} from '@babble/domain';
import type { EndedFeed } from './ended-view';

export type ChairSheet = 'bottle' | 'nappy' | 'nappy-ask' | 'baby' | 'settings';
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
  | { type: 'feed-ended'; feed: Pick<ChairFeed, 'id' | 'summary' | 'asleepSince'>; now: number; askNappy: boolean }
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
        ended: {
          id: event.feed.id,
          ...event.feed.summary,
          asleepSince: event.feed.asleepSince,
          until: event.now + CHAIR_ENDED_MS,
        },
      };
    case 'clear-ended':
      return { ...state, ended: null };
    case 'tick':
      if (!state.ended) return state;
      return event.now >= state.ended.until ? { ...state, ended: null } : { ...state, now: event.now };
  }
}

export const NAPPY_SAVED: Record<NappyType, string> = {
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Wet and dirty',
  dry: 'Dry',
};

export function nappySavedMessage(type: NappyType, sizes: ChairNappySizes): string {
  const parts = [`Nappy saved · ${NAPPY_SAVED[type]}`];
  if (sizes.wetSize)
    parts.push(type === 'both' ? `${WET_SIZE_LABELS[sizes.wetSize]} wee` : WET_SIZE_LABELS[sizes.wetSize]);
  if (sizes.pooSize) parts.push(type === 'both' ? `${SIZE_LABELS[sizes.pooSize]} poo` : SIZE_LABELS[sizes.pooSize]);
  return parts.join(' · ');
}

export function chairErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'Something went wrong. Try again.';
}
