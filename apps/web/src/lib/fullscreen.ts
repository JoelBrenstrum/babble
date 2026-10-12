import { useEffect, useState } from 'react';
import { readStorage, storageKeys, writeStorage } from './storage';

export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true;
}

export function useFullscreen() {
  const [active, setActive] = useState(() => typeof document !== 'undefined' && document.fullscreenElement !== null);
  const [wanted, setWanted] = useState(() => readStorage(storageKeys.chairFullscreen) !== 'off');

  useEffect(() => {
    const update = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  function enter() {
    setWanted(true);
    writeStorage(storageKeys.chairFullscreen, null);
    if (fullscreenSupported() && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  function exit() {
    setWanted(false);
    writeStorage(storageKeys.chairFullscreen, 'off');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }

  return { supported: fullscreenSupported(), active, wanted, enter, exit };
}
