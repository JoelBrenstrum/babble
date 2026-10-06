import { ActivityIndicator, Text, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  const color = useTokenColor('--primary');
  return (
    <View accessibilityLabel={label} className="flex-1 items-center justify-center gap-4 bg-bg">
      <Text className="font-brand text-[32px] text-primary">Babble</Text>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}
