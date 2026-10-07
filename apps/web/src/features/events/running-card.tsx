import type { BabbleClient, FamilyMemberRow } from '@babble/api';
import {
  discardNeedsConfirmation,
  formatDuration,
  formatTimer,
  feedEndTime,
  napPromptOnFeedEnd,
  segmentTotals,
  sessionNoun,
  type BabyEvent,
  type Side,
} from '@babble/domain';
import { Link, useNavigate } from '@tanstack/react-router';
import { Moon, Pause, Play, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { cn } from '#/lib/cn';
import { useNapPrompt } from '#/features/nap-prompt';
import { useDiscardSession, useSessionAction } from '#/lib/use-events';
import { clock, queryKeys } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { useNow } from '#/lib/use-now';
import { StartTimeButton, StartTimeEditor } from './start-time-editor';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

export function RunningCard({
  event,
  client,
  timeZone,
  members,
  compact = false,
  onDiscarded,
}: {
  event: BabyEvent;
  client: BabbleClient;
  timeZone: string;
  members: FamilyMemberRow[];
  compact?: boolean;
  onDiscarded?: () => void;
}) {
  const now = useNow(1000);
  const action = useSessionAction(client, event.babyId);
  const discard = useDiscardSession(client, event.babyId);
  const showNapPrompt = useNapPrompt();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const noun = sessionNoun(event.type);

  function requestDiscard() {
    if (discardNeedsConfirmation(event, clock.now())) setConfirming(true);
    else confirmDiscard();
  }

  function confirmDiscard() {
    setConfirming(false);
    discard.mutate(event);
    onDiscarded?.();
  }

  const discardControls = confirming ? (
    <DiscardConfirm
      noun={noun}
      elapsed={formatDuration(now.getTime() - Date.parse(event.startedAt), { seconds: false })}
      onKeep={() => setConfirming(false)}
      onDiscard={confirmDiscard}
    />
  ) : null;
  const startControls = editingStart ? (
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
    <StartTimeButton event={event} timeZone={timeZone} onClick={() => setEditingStart(true)} />
  );
  const navigate = useNavigate();
  const startedBy = members.find((member) => member.user_id === event.createdBy)?.display_name;

  if (event.type === 'sleep') {
    const elapsed = now.getTime() - Date.parse(event.startedAt);
    return (
      <Shell tone="sleep" compact={compact}>
        <Header
          title="Napping"
          startedBy={startedBy}
          eventId={event.id}
          compact={compact}
          noun={noun}
          onDiscard={requestDiscard}
        />
        {discardControls}
        <div className="tabular text-timer-lg font-medium text-on-sleep">{formatTimer(elapsed)}</div>
        {startControls}
        <Button
          size="lg"
          className="mt-2 w-full bg-sleep text-ink-on-solid hover:bg-on-sleep"
          loading={action.isPending}
          onClick={() => action.mutate({ event, action: { kind: 'end' } })}
        >
          {!action.isPending && <Moon className="size-5" strokeWidth={2.75} />}
          End nap
        </Button>
      </Shell>
    );
  }

  if (event.type !== 'breast_feed' && event.type !== 'pump') return null;

  const totals = segmentTotals(event.segments, now);
  const paused = totals.openSide === null;
  const currentMs = totals.openSegmentStartedAt ? now.getTime() - Date.parse(totals.openSegmentStartedAt) : 0;
  const title = event.type === 'pump' ? 'Pumping' : 'Feeding';
  const tone = event.type === 'pump' ? 'pump' : 'feed';

  function finish() {
    const running = queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(event.babyId)) ?? [];
    const ended = action.mutateAsync({ event, action: { kind: 'end' } });
    if (event.type === 'breast_feed') showNapPrompt(napPromptOnFeedEnd(running, feedEndTime(event, clock.now())));
    if (event.type === 'pump') {
      ended
        .then(() => navigate({ to: '/events/$eventId', params: { eventId: event.id }, search: { finish: true } }))
        .catch(() => undefined);
    }
  }

  return (
    <Shell tone={tone} compact={compact}>
      <Header
        title={paused ? `${title} · paused` : `${title} · ${SIDE_LABEL[totals.openSide!]}`}
        startedBy={startedBy}
        eventId={event.id}
        compact={compact}
        noun={noun}
        onDiscard={requestDiscard}
      />
      {discardControls}
      <div className="flex items-baseline gap-3">
        <span className="tabular text-timer-lg font-medium">
          {paused ? formatTimer(totals.activeMs) : formatTimer(currentMs)}
        </span>
        <span className="text-meta text-ink-2">
          {paused ? 'total so far' : `total ${formatDuration(totals.activeMs)}`}
        </span>
      </div>
      {startControls}
      <div className="grid grid-cols-2 gap-3">
        {(['left', 'right'] as const).map((side) => {
          const active = totals.openSide === side;
          const ms = side === 'left' ? totals.leftMs : totals.rightMs;
          return (
            <button
              key={side}
              type="button"
              aria-pressed={active}
              onClick={() =>
                action.mutate({
                  event,
                  action: active ? { kind: 'pause' } : paused ? { kind: 'resume', side } : { kind: 'switch', side },
                })
              }
              className={cn(
                'flex min-h-tap-lg items-center gap-3 rounded-card px-4 py-3 text-left transition-colors duration-base',
                side === 'left'
                  ? active
                    ? 'bg-feed-left text-ink-on-solid shadow-[0_0_0_4px_rgb(var(--feed-left)/0.25)]'
                    : 'border border-feed-left/40 bg-feed-left-soft text-on-feed-left'
                  : active
                    ? 'bg-feed-right text-ink-on-solid shadow-[0_0_0_4px_rgb(var(--feed-right)/0.25)]'
                    : 'border border-feed-right/40 bg-feed-right-soft text-on-feed-right',
              )}
            >
              <span className="grid size-9 place-items-center rounded-full bg-black/10 text-row-title font-bold">
                {side === 'left' ? 'L' : 'R'}
              </span>
              <span className="flex flex-col">
                <span className="text-label font-semibold">
                  {SIDE_LABEL[side]}
                  {active && ' · on'}
                </span>
                <span className="tabular text-meta">{formatDuration(ms)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => action.mutate({ event, action: paused ? { kind: 'resume' } : { kind: 'pause' } })}
        >
          {paused ? <Play className="size-5" strokeWidth={2.75} /> : <Pause className="size-5" strokeWidth={2.75} />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button size="lg" onClick={finish} loading={action.isPending && action.variables?.action.kind === 'end'}>
          <Square className="size-4" strokeWidth={3} />
          Finish
        </Button>
      </div>
    </Shell>
  );
}

function Shell({
  tone,
  compact,
  children,
}: {
  tone: 'sleep' | 'feed' | 'pump';
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-card p-5 shadow-raised',
        tone === 'sleep' && 'bg-sleep-soft',
        tone === 'feed' && 'bg-raised ring-2 ring-feed-right/40',
        tone === 'pump' && 'bg-raised ring-2 ring-pump/40',
        compact && 'p-4',
      )}
    >
      {children}
    </section>
  );
}

function Header({
  title,
  startedBy,
  eventId,
  compact,
  noun,
  onDiscard,
}: {
  title: string;
  startedBy?: string;
  eventId: string;
  compact: boolean;
  noun: string;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-3 place-items-center">
        <span data-pulse className="absolute inset-0 animate-timer-pulse rounded-full bg-session-active" />
        <span className="size-3 rounded-full bg-session-active" />
      </span>
      <span className="flex-1 text-row-title font-bold">{title}</span>
      {startedBy && (
        <span className="flex items-center gap-2 text-meta text-ink-2">
          <Avatar name={startedBy} className="size-7 text-caption" />
          <span className="hidden sm:inline">Started by {startedBy}</span>
        </span>
      )}
      {compact && (
        <Link
          to="/sessions/$eventId"
          params={{ eventId }}
          className="text-meta font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open
        </Link>
      )}
      <button
        type="button"
        aria-label={`Discard ${noun}`}
        title={`Discard ${noun}`}
        onClick={onDiscard}
        className="-mr-2 grid size-10 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-on-danger"
      >
        <Trash2 className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function DiscardConfirm({
  noun,
  elapsed,
  onKeep,
  onDiscard,
}: {
  noun: string;
  elapsed: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={`Discard this ${noun}?`}
      className="flex flex-col gap-3 rounded-tile bg-danger-soft p-4"
    >
      <p className="text-body text-on-danger">
        <strong>Discard this {noun}?</strong> It's been running for {elapsed}. You can undo straight after.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onKeep}>
          Keep {noun}
        </Button>
        <Button variant="destructive" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
