import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

export function ScreenHeader({ title, icon, right }: { title: string; icon?: ReactNode; right?: ReactNode }) {
  const color = useTokenColor('--ink');
  return (
    <View className="mb-5 flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        className="size-tap items-center justify-center rounded-full active:bg-surface"
      >
        <ChevronLeft size={26} color={color} strokeWidth={2.75} />
      </Pressable>
      {icon}
      <Text className="flex-1 font-bold text-title text-ink" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
