import { keepAwakeHint } from '@babble/domain';
import { useBatteryState } from 'expo-battery';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { isCharging, loadKeepAwake, saveKeepAwake } from '@/lib/keep-awake';
import { useTokenColor } from '@/lib/theme';

const TAG = 'babble-session';

export function KeepAwakeToggle() {
  const [on, setOn] = useState(false);
  const charging = isCharging(useBatteryState());
  const iconColor = useTokenColor('--ink-2');
  const primary = useTokenColor('--primary');
  const track = useTokenColor('--line-strong');

  useEffect(() => {
    void loadKeepAwake().then(setOn);
  }, []);

  useEffect(() => {
    if (!on) return;
    void activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => void deactivateKeepAwake(TAG).catch(() => undefined);
  }, [on]);

  function toggle(next: boolean) {
    setOn(next);
    void saveKeepAwake(next);
  }

  return (
    <Card className="flex-row items-center gap-3 p-4">
      <View className="size-10 items-center justify-center rounded-full bg-surface">
        <Sun size={20} color={iconColor} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-label text-ink">Keep screen on</Text>
        <Text className="font-sans text-meta text-ink-2">{keepAwakeHint(on, charging)}</Text>
      </View>
      <Switch
        accessibilityLabel="Keep screen on"
        value={on}
        onValueChange={toggle}
        trackColor={{ true: primary, false: track }}
      />
    </Card>
  );
}
