import { reloadPage } from './reload';

export const RESUME_RELOAD_AFTER_MS = 5 * 60_000;

export interface ResumeState {
  hiddenAt: number | null;
  now: number;
  online: boolean;
  pathname: string;
}

export function shouldReloadOnResume(
  { hiddenAt, now, online, pathname }: ResumeState,
  threshold = RESUME_RELOAD_AFTER_MS,
): boolean {
  if (hiddenAt === null || !online || pathname === '/chair') return false;
  return now - hiddenAt >= threshold;
}

export function watchResume(reload: () => void = reloadPage, threshold = RESUME_RELOAD_AFTER_MS): () => void {
  let hiddenAt: number | null = null;
  const onChange = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt ??= Date.now();
      return;
    }
    const state = { hiddenAt, now: Date.now(), online: navigator.onLine, pathname: window.location.pathname };
    hiddenAt = null;
    if (shouldReloadOnResume(state, threshold)) reload();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
