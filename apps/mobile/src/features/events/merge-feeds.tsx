import type { BabbleClient } from '@babble/api';
import { useAsyncAction, useMergeFeeds } from '@babble/api/react';
import { liveMergeText, mergeGapText, type FeedMerge } from '@babble/domain';
import { Merge } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

function useMerge(client: BabbleClient, babyId: string, merge: FeedMerge, onMerged?: () => void) {
  const mutation = useMergeFeeds(client, babyId);
  const { run, busy, error } = useAsyncAction();
  const [confirming, setConfirming] = useState(false);
  const confirm = () =>
    void run(async () => {
      await mutation.mutateAsync({ earlierId: merge.earlierId, laterId: merge.laterId });
      setConfirming(false);
      onMerged?.();
    });
  return { busy, error, confirming, setConfirming, confirm };
}

function MergeConfirm({
  message,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  message: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View accessibilityLabel="Merge feeds" className="gap-3">
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

export function MergeFeedsRow({ client, babyId, merge }: { client: BabbleClient; babyId: string; merge: FeedMerge }) {
  const { busy, error, confirming, setConfirming, confirm } = useMerge(client, babyId, merge);
  const iconColor = useTokenColor('--ink-2');
  if (confirming) {
    return (
      <View className="border-t border-line bg-surface px-4 py-3">
        <MergeConfirm
          message="Merge these two feeds into one? Their sides and notes are combined, and this can't be undone."
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
  merge: FeedMerge;
  onMerged: () => void;
}) {
  const { busy, error, confirming, setConfirming, confirm } = useMerge(client, babyId, merge, onMerged);
  const iconColor = useTokenColor('--ink-2');
  return (
    <Card className="gap-3 p-4">
      {confirming ? (
        <MergeConfirm
          message="Merge this feed into the last one? It keeps running as one feed, with both feeds' sides."
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <View className="flex-row flex-wrap items-center gap-3">
          <Merge size={20} color={iconColor} strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text className="min-w-[160px] flex-1 font-sans text-meta text-ink-2">{liveMergeText(merge.gapMs)}</Text>
          <Button variant="secondary" onPress={() => setConfirming(true)}>
            Merge into it
          </Button>
        </View>
      )}
    </Card>
  );
}
