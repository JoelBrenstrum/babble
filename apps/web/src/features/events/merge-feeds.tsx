import type { BabbleClient } from '@babble/api';
import { useAsyncAction, useMergeFeeds } from '@babble/api/react';
import { liveMergeText, mergeGapText, type FeedMerge } from '@babble/domain';
import { Merge } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';

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
    <div role="alertdialog" aria-label="Merge feeds" className="flex flex-col gap-3">
      <p className="text-meta text-ink-2">{message}</p>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <div className="flex gap-3">
        <Button loading={busy} onClick={onConfirm}>
          Merge
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function MergeFeedsRow({ client, babyId, merge }: { client: BabbleClient; babyId: string; merge: FeedMerge }) {
  const { busy, error, confirming, setConfirming, confirm } = useMerge(client, babyId, merge);
  if (confirming) {
    return (
      <div className="bg-surface px-4 py-3">
        <MergeConfirm
          message="Merge these two feeds into one? Their sides and notes are combined, and this can't be undone."
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-surface px-4 py-1.5 text-meta text-ink-2">
      <Merge aria-hidden className="size-4 rotate-180" strokeWidth={2.5} />
      <span className="flex-1">{mergeGapText(merge.gapMs)}</span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-10 rounded-button px-2 font-semibold text-primary hover:bg-line"
      >
        Merge
      </button>
    </div>
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
  return (
    <Card className="flex flex-col gap-3 p-4">
      {confirming ? (
        <MergeConfirm
          message="Merge this feed into the last one? It keeps running as one feed, with both feeds' sides."
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Merge aria-hidden className="size-5 shrink-0 rotate-180 text-ink-2" strokeWidth={2.5} />
          <span className="min-w-[10rem] flex-1 text-meta text-ink-2">{liveMergeText(merge.gapMs)}</span>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Merge into it
          </Button>
        </div>
      )}
    </Card>
  );
}
