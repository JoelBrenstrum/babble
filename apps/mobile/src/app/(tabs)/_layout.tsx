import { queryKeys } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { ChartColumn, History, House, Settings } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/page-spinner';
import { useTokenColor } from '@/lib/theme';
import { useOnboarding } from '@/lib/use-onboarding';

export default function TabsLayout() {
  const { loading, state, error } = useOnboarding();
  const queryClient = useQueryClient();
  const active = useTokenColor('--on-primary-soft');
  const inactive = useTokenColor('--ink-3');
  const surface = useTokenColor('--raised');
  const line = useTokenColor('--line');

  if (loading) return <PageSpinner />;
  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
        <Text className="text-center font-sans text-body text-ink-2">
          Couldn't load your family. Check your connection.
        </Text>
        <Button
          variant="secondary"
          onPress={() => queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' })}
        >
          Retry
        </Button>
      </View>
    );
  }
  if (state?.step === 'sign-in') return <Redirect href="/sign-in" />;
  if (state?.step === 'family') return <Redirect href="/onboarding/family" />;
  if (state?.step === 'baby') return <Redirect href="/onboarding/baby" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: { backgroundColor: surface, borderTopColor: line, height: 84 },
        tabBarLabelStyle: { fontFamily: 'Figtree-SemiBold', fontSize: 12 },
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <House color={color} size={22} strokeWidth={2.75} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <History color={color} size={22} strokeWidth={2.75} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <ChartColumn color={color} size={22} strokeWidth={2.75} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={22} strokeWidth={2.75} />,
        }}
      />
    </Tabs>
  );
}
