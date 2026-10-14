import { useEffect, useState } from 'react';

export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true;
}

export function browserFullscreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(display-mode: fullscreen)').matches === true;
}

export function useFullscreen() {
  const [active, setActive] = useState(() => typeof document !== 'undefined' && document.fullscreenElement !== null);

  useEffect(() => {
    const update = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  function enter() {
    if (fullscreenSupported() && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  function exit() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }

  return { supported: fullscreenSupported() && (active || !browserFullscreen()), active, enter, exit };
}
