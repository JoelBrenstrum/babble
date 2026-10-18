import { Text, View } from 'react-native';

const TONES = {
  danger: { bg: 'bg-danger-soft', text: 'text-on-danger' },
  success: { bg: 'bg-success-soft', text: 'text-on-success' },
  info: { bg: 'bg-info-soft', text: 'text-on-info' },
};

export function StatusMessage({ tone, children }: { tone: 'danger' | 'success' | 'info'; children: string }) {
  const { bg, text } = TONES[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : 'text'} className={`rounded-tile px-4 py-3 ${bg}`}>
      <Text className={`font-sans text-meta ${text}`}>{children}</Text>
    </View>
  );
}
