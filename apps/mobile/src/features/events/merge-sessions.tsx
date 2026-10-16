import type { BabbleClient } from '@babble/api';
import { useAsyncAction, useMergeSessions } from '@babble/api/react';
import { liveMergeText, mergeCopy, mergeGapText, type SessionMerge } from '@babble/domain';
import { Merge } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

function useMerge(client: BabbleClient, babyId: string, merge: SessionMerge, onMerged?: () => void) {
  const mutation = useMergeSessions(client, babyId);
  const { run, busy, error } = useAsyncAction();
  const [confirming, setConfirming] = useState(false);
  const confirm = () =>
    void run(async () => {
      await mutation.mutateAsync(merge);
      setConfirming(false);
      onMerged?.();
    });
  return { busy, error, confirming, setConfirming, confirm };
}

function MergeConfirm({
  title,
  message,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View accessibilityLabel={title} className="gap-3">
      <Text className="font-sans text-meta text-ink-2">{message}</Text>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <View className="flex-row gap-3">
        <Button loading={busy} onPress={onConfirm}>
          Merge
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

export function MergeSessionsRow({
  client,
  babyId,
  merge,
}: {
  client: BabbleClient;
  babyId: string;
  merge: SessionMerge;
}) {
  const { busy, error, confirming, setConfirming, confirm } = useMerge(client, babyId, merge);
  const copy = mergeCopy(merge.type);
  const iconColor = useTokenColor('--ink-2');
  if (confirming) {
    return (
      <View className="border-t border-line bg-surface px-4 py-3">
        <MergeConfirm
          title={copy.title}
          message={copy.confirm}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-2 border-t border-line bg-surface px-4 py-1.5">
      <Merge size={16} color={iconColor} strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
      <Text className="flex-1 font-sans text-meta text-ink-2">{mergeGapText(merge.gapMs)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Merge"
        onPress={() => setConfirming(true)}
        className="h-10 justify-center rounded-button px-2"
      >
        <Text className="font-semibold text-meta text-primary">Merge</Text>
      </Pressable>
    </View>
  );
}

export function LiveMergeOffer({
  client,
  babyId,
  merge,
  onMerged,
}: {
  client: BabbleClient;
  babyId: string;
  merge: SessionMerge;
  onMerged: () => void;
}) {
  const { busy, error, confirming, setConfirming, confirm } = useMerge(client, babyId, merge, onMerged);
  const copy = mergeCopy(merge.type);
  const iconColor = useTokenColor('--ink-2');
  return (
    <Card className="gap-3 p-4">
      {confirming ? (
        <MergeConfirm
          title={copy.title}
          message={copy.liveConfirm}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <View className="flex-row flex-wrap items-center gap-3">
          <Merge size={20} color={iconColor} strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text className="min-w-[160px] flex-1 font-sans text-meta text-ink-2">{liveMergeText(merge)}</Text>
          <Button variant="secondary" onPress={() => setConfirming(true)}>
            Merge into it
          </Button>
        </View>
      )}
    </Card>
  );
}
