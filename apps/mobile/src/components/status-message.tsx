import { Text, View } from 'react-native';

export function StatusMessage({ tone, children }: { tone: 'danger' | 'success' | 'info'; children: string }) {
  const styles = {
    danger: 'bg-danger-soft text-on-danger',
    success: 'bg-success-soft text-on-success',
    info: 'bg-info-soft text-on-info',
  }[tone];
  const [bg, text] = styles.split(' ');
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : 'text'} className={`rounded-tile px-4 py-3 ${bg}`}>
      <Text className={`font-sans text-meta ${text}`}>{children}</Text>
    </View>
  );
}
