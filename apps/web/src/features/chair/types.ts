import type { BottleContent, ChairNappySizes, ChairViewModel, NappyType, Side } from '@babble/domain';

export type { ChairBaby, ChairFeed } from '@babble/domain';

export type ChairData = ChairViewModel & {
  updateReady: boolean;
  fullscreen: { supported: boolean; active: boolean };
  offline: boolean;
};

export interface ChairActions {
  startFeed: (side: Side) => Promise<'started' | 'resumed'>;
  switchSide: (side: Side) => void;
  pause: () => void;
  resume: (side: Side) => void;
  endFeed: () => Promise<unknown>;
  resumeFeed: (feedId: string) => Promise<unknown>;
  saveBottle: (amount: number, content: BottleContent) => Promise<string>;
  saveNappy: (type: NappyType, sizes: ChairNappySizes) => Promise<string>;
  startNap: (at?: string) => Promise<string>;
  endNap: () => Promise<unknown>;
  pauseNap: () => void;
  resumeNap: () => void;
  undoEntry: (eventId: string) => Promise<unknown>;
  restoreEntry: (eventId: string) => Promise<unknown>;
  wake: () => { screenWasOff: boolean };
  dimNow: () => void;
  refresh: () => void;
  signOut: () => Promise<void>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  selectBaby?: (babyId: string) => void;
}
