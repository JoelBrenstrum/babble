import { nightThemeHint, type NightWindow, type ThemePreference } from '@babble/domain';
import { Text, View } from 'react-native';
import { SectionLabel } from '@/components/card';
import { Segmented } from '@/components/segmented';

export function AppearanceSettings({
  value,
  babyName,
  night,
  onChange,
}: {
  value: ThemePreference;
  babyName: string;
  night: NightWindow | null;
  onChange: (value: ThemePreference) => void;
}) {
  return (
    <View className="gap-3">
      <SectionLabel>Appearance</SectionLabel>
      <Segmented
        value={value}
        onChange={onChange}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'night', label: 'Dark at night' },
        ]}
      />
      {value === 'night' && <Text className="font-sans text-meta text-ink-2">{nightThemeHint(babyName, night)}</Text>}
    </View>
  );
}
