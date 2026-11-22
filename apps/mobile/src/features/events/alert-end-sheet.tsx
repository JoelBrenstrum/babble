import { ALERT_END_LABELS, ALERT_ENDS, type AlertEnd } from '@babble/domain';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/button';

export function AlertEndSheet({
  visible,
  pending,
  onChoose,
  onClose,
}: {
  visible: boolean;
  pending: AlertEnd | 'skip' | null;
  onChoose: (reason: AlertEnd | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" className="flex-1 bg-scrim/40" onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="gap-4 rounded-t-sheet bg-raised px-5 pb-4 pt-3">
        <View className="h-1.5 w-10 self-center rounded-full bg-line-strong" />
        <Text accessibilityRole="header" className="font-bold text-heading text-ink">
          What ended it?
        </Text>
        <Text className="font-sans text-body text-ink-2">Fell asleep starts a nap from the same moment.</Text>
        <View className="gap-2">
          {ALERT_ENDS.map((reason) => (
            <Button
              key={reason}
              size="lg"
              variant={reason === 'asleep' ? 'sleep' : 'secondary'}
              loading={pending === reason}
              disabled={pending !== null && pending !== reason}
              onPress={() => onChoose(reason)}
            >
              {ALERT_END_LABELS[reason]}
            </Button>
          ))}
          <Button
            size="lg"
            variant="ghost"
            loading={pending === 'skip'}
            disabled={pending !== null && pending !== 'skip'}
            onPress={() => onChoose(null)}
          >
            Skip
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
