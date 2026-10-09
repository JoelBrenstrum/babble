import { parseNightWindow, themeOverride, type NightWindow, type ThemePreference } from '@babble/domain';
import { readStorage, storageKeys } from './storage';

export type { ThemePreference };

export function resolveTheme(
  preference: string | null,
  prefersDark: boolean,
  night: NightWindow | null = null,
  now: Date = new Date(),
): 'light' | 'dark' {
  return themeOverride(preference, night, now) ?? (prefersDark ? 'dark' : 'light');
}

export const THEME_COLORS = { light: '#f3f0e8', dark: '#141612' } as const;
const OVERRIDE_ID = 'theme-color-override';

// Rendered in the document directly because route head() keeps only one meta per name.
export const themeColorMeta = [
  { name: 'theme-color', content: THEME_COLORS.light, media: '(prefers-color-scheme: light)' },
  { name: 'theme-color', content: THEME_COLORS.dark, media: '(prefers-color-scheme: dark)' },
];

// The browser uses the first matching theme-color tag, so an in-app override goes first in the head.
function setThemeColorOverride(color: string | null): void {
  let tag = document.getElementById(OVERRIDE_ID);
  if (color === null) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.id = OVERRIDE_ID;
    tag.setAttribute('name', 'theme-color');
    document.head.prepend(tag);
  }
  tag.setAttribute('content', color);
}

export const themeBootScript = `(() => {
  let preference = null;
  let night = null;
  try {
    preference = localStorage.getItem('${storageKeys.theme}');
    night = JSON.parse(localStorage.getItem('${storageKeys.night}'));
  } catch {}
  let override = preference === 'light' || preference === 'dark' ? preference : null;
  if (preference === 'night' && night && typeof night.timeZone === 'string') {
    try {
      const parts = {};
      const format = new Intl.DateTimeFormat('en-CA', { timeZone: night.timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
      for (const part of format.formatToParts(new Date())) parts[part.type] = part.value;
      const minutes = Number(parts.hour) * 60 + Number(parts.minute);
      const within = night.start === night.end ? false : night.start < night.end
        ? minutes >= night.start && minutes < night.end
        : minutes >= night.start || minutes < night.end;
      override = within ? 'dark' : 'light';
    } catch {}
  }
  const dark = override ? override === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  if (override) {
    const tag = document.createElement('meta');
    tag.id = '${OVERRIDE_ID}';
    tag.name = 'theme-color';
    tag.content = override === 'dark' ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}';
    document.head.prepend(tag);
  }
})();`;

export function readNightWindow(): NightWindow | null {
  return parseNightWindow(readStorage(storageKeys.night));
}

export function applyTheme(
  preference: ThemePreference,
  night: NightWindow | null = readNightWindow(),
  now: Date = new Date(),
): void {
  const override = themeOverride(preference, night, now);
  const theme = override ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  setThemeColorOverride(override === null ? null : THEME_COLORS[override]);
}
