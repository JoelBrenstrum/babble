import { useSyncExternalStore } from 'react';
import { installMode, type InstallMode } from './install';
import { readStorage, storageKeys, writeStorage } from './storage';

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptState {
  event: InstallPromptEvent | null;
  installed: boolean;
}

export function createInstallPromptStore() {
  let state: InstallPromptState = { event: null, installed: false };
  let target: EventTarget | null = null;
  const listeners = new Set<() => void>();

  function set(next: Partial<InstallPromptState>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  return {
    capture(on: EventTarget) {
      if (target) return;
      target = on;
      state = { ...state, installed: readStorage(storageKeys.installed) === '1' };
      on.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        set({ event: event as InstallPromptEvent });
      });
      on.addEventListener('appinstalled', () => {
        writeStorage(storageKeys.installed, '1');
        set({ event: null, installed: true });
      });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getState: () => state,
    async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      const { event } = state;
      if (!event) return 'unavailable';
      set({ event: null });
      await event.prompt();
      return (await event.userChoice).outcome;
    },
  };
}

export const installPrompt = createInstallPromptStore();

export function captureInstallPrompt(): void {
  if (typeof window !== 'undefined') installPrompt.capture(window);
}

const SERVER_STATE: InstallPromptState = { event: null, installed: false };

function runningStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
  );
}

export interface Install {
  mode: InstallMode;
  prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstall(): Install {
  const state = useSyncExternalStore(installPrompt.subscribe, installPrompt.getState, () => SERVER_STATE);
  const mode = installMode({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: runningStandalone(),
    installed: state.installed,
    canPrompt: state.event !== null,
  });
  return { mode, prompt: installPrompt.prompt };
}
