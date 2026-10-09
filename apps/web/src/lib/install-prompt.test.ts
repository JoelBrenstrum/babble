import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstallPromptStore, type InstallPromptEvent } from './install-prompt';

function promptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent;
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('install prompt store', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the browser prompt and uses it once', async () => {
    const store = createInstallPromptStore();
    const target = new EventTarget();
    store.capture(target);
    const event = promptEvent('accepted');
    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(store.getState().event).toBe(event);
    expect(await store.prompt()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(store.getState().event).toBeNull();
    expect(await store.prompt()).toBe('unavailable');
  });

  it('remembers an install for good', () => {
    const store = createInstallPromptStore();
    const target = new EventTarget();
    const listener = vi.fn();
    store.capture(target);
    store.subscribe(listener);
    target.dispatchEvent(new Event('appinstalled'));

    expect(store.getState().installed).toBe(true);
    expect(listener).toHaveBeenCalled();
    const later = createInstallPromptStore();
    later.capture(new EventTarget());
    expect(later.getState().installed).toBe(true);
  });
});
