export type ThemePreference = 'system' | 'light' | 'dark';

export function resolveTheme(preference: string | null, prefersDark: boolean): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference;
  return prefersDark ? 'dark' : 'light';
}

export const themeBootScript = `(() => {
  let preference = null;
  try { preference = localStorage.getItem('babble.theme'); } catch {}
  const dark = preference === 'dark' || (preference !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();`;

export function applyTheme(preference: ThemePreference): void {
  const theme = resolveTheme(preference, window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}
