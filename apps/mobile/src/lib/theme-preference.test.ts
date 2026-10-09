import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorSchemeFor, loadThemePreference, saveThemePreference } from './theme-preference';

const night = { timeZone: 'Pacific/Auckland', start: 1140, end: 420 };

describe('colorSchemeFor', () => {
  it('is dark during the night window and light outside it', () => {
    expect(colorSchemeFor('night', night, new Date('2026-10-09T08:00:00Z'))).toBe('dark');
    expect(colorSchemeFor('night', night, new Date('2026-10-09T01:00:00Z'))).toBe('light');
  });

  it('follows the system until the baby settings load', () => {
    expect(colorSchemeFor('night', null, new Date('2026-10-09T08:00:00Z'))).toBe('system');
  });

  it('keeps fixed choices', () => {
    expect(colorSchemeFor('light', night, new Date('2026-10-09T08:00:00Z'))).toBe('light');
    expect(colorSchemeFor('system', night, new Date('2026-10-09T08:00:00Z'))).toBe('system');
  });
});

describe('theme preference storage', () => {
  afterEach(() => AsyncStorage.clear());

  it('round-trips dark at night', async () => {
    await saveThemePreference('night');
    expect(await loadThemePreference()).toBe('night');
  });

  it('defaults to system', async () => {
    expect(await loadThemePreference()).toBe('system');
  });
});
