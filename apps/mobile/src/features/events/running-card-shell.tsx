import { clock, type BabbleClient, type Author } from '@babble/api';
import { useDiscardSession, useSessionAction } from '@babble/api/react';
import { discardNeedsConfirmation, formatDuration, sessionNoun, type BabyEvent } from '@babble/domain';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { useTokenColor } from '@/lib/theme';
import { EndTimeButton, EndTimeEditor } from './end-time-editor';
import { StartTimeButton, StartTimeEditor } from './start-time-editor';

export interface RunningCardProps {
  event: BabyEvent;
  client: BabbleClient;
  timeZone: string;
  members: Author[];
  compact?: boolean;
  onDiscarded?: () => void;
}

export function useRunningCardShell({
  event,
  client,
  timeZone,
  members,
  compact = false,
  onDiscarded,
}: RunningCardProps) {
  const action = useSessionAction(client, event.babyId);
  const discard = useDiscardSession(client, event.babyId);
  const trashColor = useTokenColor('--ink-3');
  const noun = sessionNoun(event.type);
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const startedBy = members.find((member) => member.user_id === event.createdBy)?.display_name;

  function discardNow() {
    discard.mutate(event);
    onDiscarded?.();
  }

  function requestDiscard() {
    if (!discardNeedsConfirmation(event, clock.now())) return discardNow();
    const elapsed = formatDuration(clock.now().getTime() - Date.parse(event.startedAt), { seconds: false });
    Alert.alert(`Discard this ${noun}?`, `It's been running for ${elapsed}. You can undo straight after.`, [
      { text: `Keep ${noun}`, style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discardNow },
    ]);
  }

  const startControls: ReactNode = editingStart ? (
    <StartTimeEditor
      event={event}
      timeZone={timeZone}
      onCancel={() => setEditingStart(false)}
      onSave={(startedAt) => {
        setEditingStart(false);
        action.mutate({ event, action: { kind: 'set-start', startedAt } });
      }}
    />
  ) : (
    <StartTimeButton event={event} timeZone={timeZone} onPress={() => setEditingStart(true)} />
  );

  const endControls = (end: (at?: string) => void): ReactNode =>
    editingEnd ? (
      <EndTimeEditor
        event={event}
        timeZone={timeZone}
        onCancel={() => setEditingEnd(false)}
        onEnd={(at) => {
          setEditingEnd(false);
          end(at);
        }}
      />
    ) : (
      <EndTimeButton onPress={() => setEditingEnd(true)} />
    );

  const header = (title: string, paused: boolean): ReactNode => (
    <View className="flex-row items-center gap-3">
      <View
        testID={paused ? 'session-dot-paused' : 'session-dot-running'}
        className={`size-3 rounded-full ${paused ? 'bg-session-downtime' : 'bg-session-active'}`}
      />
      <Text className="font-bold text-row-title text-ink">{title}</Text>
      <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
        {startedBy && (
          <>
            <Avatar name={startedBy} />
            <Text numberOfLines={1} className="shrink font-sans text-meta text-ink-2">{`Started by ${startedBy}`}</Text>
          </>
        )}
      </View>
      {compact && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/sessions/${event.id}`)}
          className="min-h-tap justify-center"
        >
          <Text className="font-semibold text-meta text-primary">Open</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Discard ${noun}`}
        onPress={requestDiscard}
        className="size-10 items-center justify-center rounded-full active:bg-danger-soft"
      >
        <Trash2 size={20} color={trashColor} strokeWidth={2.5} />
      </Pressable>
    </View>
  );

  return { action, header, startControls, endControls };
}
