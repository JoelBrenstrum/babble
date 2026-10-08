export type ThemePreference = 'system' | 'light' | 'dark';

export function resolveTheme(preference: string | null, prefersDark: boolean): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference;
  return prefersDark ? 'dark' : 'light';
}

export const THEME_COLORS = { light: '#f3f0e8', dark: '#141612' } as const;
const OVERRIDE_ID = 'theme-color-override';

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
  try { preference = localStorage.getItem('babble.theme'); } catch {}
  const dark = preference === 'dark' || (preference !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  if (preference === 'light' || preference === 'dark') {
    const tag = document.createElement('meta');
    tag.id = '${OVERRIDE_ID}';
    tag.name = 'theme-color';
    tag.content = preference === 'dark' ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}';
    document.head.prepend(tag);
  }
})();`;

export function applyTheme(preference: ThemePreference): void {
  const theme = resolveTheme(preference, window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  setThemeColorOverride(preference === 'system' ? null : THEME_COLORS[theme]);
}
