import { useEndAlert, useNow } from '@babble/api/react';
import { formatTimer, type AlertEnd, type BabyEvent } from '@babble/domain';
import { router } from 'expo-router';
import { Square } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { useTokenColor } from '@/lib/theme';
import { AlertEndSheet } from './alert-end-sheet';
import { useRunningCardShell, type RunningCardProps } from './running-card-shell';

export function AlertRunningCard(props: RunningCardProps & { event: Extract<BabyEvent, { type: 'alert' }> }) {
  const { event, client } = props;
  const now = useNow(1000);
  const { header, startControls, endControls } = useRunningCardShell(props);
  const endAlert = useEndAlert(client, event.babyId);
  const onSolidColor = useTokenColor('--ink-on-solid');
  const [stopAt, setStopAt] = useState<{ at?: string } | null>(null);
  const [pending, setPending] = useState<AlertEnd | 'skip' | null>(null);

  async function choose(reason: AlertEnd | null) {
    setPending(reason ?? 'skip');
    try {
      const napId = await endAlert.mutateAsync({ event, reason, at: stopAt?.at });
      setStopAt(null);
      if (napId) router.replace(`/sessions/${napId}`);
    } catch {
      setPending(null);
    }
  }

  return (
    <View className="gap-3 rounded-card bg-alert-soft p-5">
      {header('Alert', false)}
      <Text className="font-medium text-timer-lg text-on-alert">
        {formatTimer(now.getTime() - Date.parse(event.startedAt))}
      </Text>
      {startControls}
      <Button
        variant="alert"
        size="lg"
        icon={<Square size={16} color={onSolidColor} strokeWidth={3} />}
        onPress={() => setStopAt({})}
      >
        Stop
      </Button>
      {endControls((at) => setStopAt({ at }))}
      <AlertEndSheet
        visible={stopAt !== null}
        pending={pending}
        onChoose={(reason) => void choose(reason)}
        onClose={() => {
          if (pending === null) setStopAt(null);
        }}
      />
    </View>
  );
}
