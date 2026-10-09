import { babySettingsQuery, type BabbleClient, type BabyRow } from '@babble/api';
import { nightThemeHint, parseThemePreference } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SectionLabel } from '#/components/ui/card';
import { Segmented } from '#/components/ui/segmented';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';
import { applyTheme, type ThemePreference } from '#/lib/theme';

export function AppearanceSettings({ client, baby }: { client: BabbleClient; baby: BabyRow }) {
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const [theme, setTheme] = useState<ThemePreference>(() => parseThemePreference(readStorage(storageKeys.theme)));

  function change(next: ThemePreference) {
    setTheme(next);
    writeStorage(storageKeys.theme, next === 'system' ? null : next);
    applyTheme(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Appearance</SectionLabel>
      <Segmented
        label="Theme"
        value={theme}
        onChange={change}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'night', label: 'Dark at night' },
        ]}
      />
      {theme === 'night' && (
        <p className="text-meta text-ink-2">
          {nightThemeHint(
            baby.name,
            settings
              ? { timeZone: baby.timezone, start: settings.night_start_minutes, end: settings.night_end_minutes }
              : null,
          )}
        </p>
      )}
    </section>
  );
}
