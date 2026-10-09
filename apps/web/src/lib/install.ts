export type InstallMode = 'installed' | 'ios-safari' | 'ios-other' | 'prompt' | 'none';

export interface InstallEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
  installed: boolean;
  canPrompt: boolean;
}

export const INSTALL_SNOOZE_MS = 14 * 24 * 3_600_000;

const IOS_OTHER_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|Line\//;

export function isIos({
  userAgent,
  maxTouchPoints,
}: Pick<InstallEnvironment, 'userAgent' | 'maxTouchPoints'>): boolean {
  // iPadOS asks for desktop sites by default and then reports itself as a Mac.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function installMode(env: InstallEnvironment): InstallMode {
  if (env.standalone || env.installed) return 'installed';
  if (isIos(env)) {
    return /Safari\//.test(env.userAgent) && !IOS_OTHER_BROWSERS.test(env.userAgent) ? 'ios-safari' : 'ios-other';
  }
  return env.canPrompt ? 'prompt' : 'none';
}

export function installSnoozed(dismissedAt: string | null, now: Date): boolean {
  if (!dismissedAt) return false;
  const elapsed = now.getTime() - Date.parse(dismissedAt);
  return elapsed >= 0 && elapsed < INSTALL_SNOOZE_MS;
}

export function showInstallCard(mode: InstallMode, dismissedAt: string | null, now: Date): boolean {
  return (mode === 'ios-safari' || mode === 'ios-other' || mode === 'prompt') && !installSnoozed(dismissedAt, now);
}
