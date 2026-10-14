import { clock, queryKeys, type BabbleClient, type BabySettings, type Author } from '@babble/api';
import { useDiscardSession, useSessionAction } from '@babble/api/react';
import {
  discardNeedsConfirmation,
  feedEndTime,
  formatDuration,
  formatTimer,
  pausedForMs,
  promptsForSessionEvent,
  segmentTotals,
  SIDE_LABEL,
  sessionNoun,
  summariseSleep,
  type BabyEvent,
  type EventOfType,
  type Side,
} from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Moon, Pause, Play, Square, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { ConfirmPanel } from '#/components/ui/confirm-panel';
import { cn } from '#/lib/cn';
import { useNapPrompt } from '#/features/nap-prompt';
import { useNow } from '#/lib/use-now';
import { EndTimeButton, EndTimeEditor } from './end-time-editor';
import { StartTimeButton, StartTimeEditor } from './start-time-editor';

const SIDE_BUTTON: Record<Side, { active: string; idle: string }> = {
  left: {
    active: 'bg-feed-left text-ink-on-solid shadow-[0_0_0_4px_rgb(var(--feed-left)/0.25)]',
    idle: 'border border-feed-left/40 bg-feed-left-soft text-on-feed-left',
  },
  right: {
    active: 'bg-feed-right text-ink-on-solid shadow-[0_0_0_4px_rgb(var(--feed-right)/0.25)]',
    idle: 'border border-feed-right/40 bg-feed-right-soft text-on-feed-right',
  },
};

const SIDES: readonly Side[] = ['left', 'right'];

interface RunningCardProps {
  client: BabbleClient;
  timeZone: string;
  members: Author[];
  compact?: boolean;
  onDiscarded?: () => void;
}

export function RunningCard({
  event,
  readOnly = false,
  ...props
}: RunningCardProps & { event: BabyEvent; readOnly?: boolean }) {
  const card =
    event.type === 'sleep' ? (
      <SleepRunningCard event={event} {...props} />
    ) : event.type === 'breast_feed' || event.type === 'pump' ? (
      <FeedRunningCard event={event} {...props} />
    ) : null;
  if (!card || !readOnly) return card;
  return (
    <fieldset disabled className="contents">
      {card}
    </fieldset>
  );
}

function useSessionEditors({
  event,
  client,
  timeZone,
  now,
  onDiscarded,
}: {
  event: BabyEvent;
  client: BabbleClient;
  timeZone: string;
  now: Date;
  onDiscarded?: () => void;
}) {
  const action = useSessionAction(client, event.babyId);
  const discard = useDiscardSession(client, event.babyId);
  const [confirming, setConfirming] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const noun = sessionNoun(event.type);

  function confirmDiscard() {
    setConfirming(false);
    discard.mutate(event);
    onDiscarded?.();
  }

  function requestDiscard() {
    if (discardNeedsConfirmation(event, clock.now())) setConfirming(true);
    else confirmDiscard();
  }

  const discardControls = confirming ? (
    <ConfirmPanel
      label={`Discard this ${noun}?`}
      message={
        <>
          <strong>Discard this {noun}?</strong> It's been running for{' '}
          {formatDuration(now.getTime() - Date.parse(event.startedAt), { seconds: false })}. You can undo straight
          after.
        </>
      }
      confirmLabel="Discard"
      cancelLabel={`Keep ${noun}`}
      onConfirm={confirmDiscard}
      onCancel={() => setConfirming(false)}
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

  const endControls = (end: (at?: string) => void) =>
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
      <EndTimeButton onClick={() => setEditingEnd(true)} />
    );

  return { action, noun, requestDiscard, discardControls, startControls, endControls };
}

const startedByName = (members: Author[], event: BabyEvent) =>
  members.find((member) => member.user_id === event.createdBy)?.display_name;

function SleepRunningCard({
  event,
  client,
  timeZone,
  members,
  compact = false,
  onDiscarded,
}: RunningCardProps & { event: EventOfType<'sleep'> }) {
  const now = useNow(1000);
  const { action, noun, requestDiscard, discardControls, startControls, endControls } = useSessionEditors({
    event,
    client,
    timeZone,
    now,
    onDiscarded,
  });
  const sleep = summariseSleep(event, now);
  const ending = action.isPending && action.variables?.action.kind === 'end';

  return (
    <Shell tone="sleep" compact={compact}>
      <Header
        title={sleep.paused ? 'Awake · nap paused' : 'Napping'}
        paused={sleep.paused}
        startedBy={startedByName(members, event)}
        eventId={event.id}
        compact={compact}
        noun={noun}
        onDiscard={requestDiscard}
      />
      {discardControls}
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={cn('tabular text-timer-lg font-medium', sleep.paused ? 'text-ink-2' : 'text-on-sleep')}>
          {formatTimer(sleep.asleepMs)}
        </span>
        {sleep.wakeUps > 0 && (
          <span className="tabular text-meta text-ink-2">
            awake {formatDuration(sleep.awakeMs)} · {sleep.wakeUps === 1 ? '1 wake-up' : `${sleep.wakeUps} wake-ups`}
          </span>
        )}
      </div>
      {startControls}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => action.mutate({ event, action: sleep.paused ? { kind: 'resume' } : { kind: 'pause' } })}
        >
          {sleep.paused ? (
            <Play className="size-5" strokeWidth={2.75} />
          ) : (
            <Pause className="size-5" strokeWidth={2.75} />
          )}
          {sleep.paused ? 'Resume nap' : 'Pause nap'}
        </Button>
        <Button
          size="lg"
          className="bg-sleep text-ink-on-solid hover:bg-on-sleep"
          loading={ending}
          onClick={() => action.mutate({ event, action: { kind: 'end' } })}
        >
          {!ending && <Moon className="size-5" strokeWidth={2.75} />}
          End nap
        </Button>
      </div>
      {endControls((at) => action.mutate({ event, action: { kind: 'end', at } }))}
    </Shell>
  );
}

function FeedRunningCard({
  event,
  client,
  timeZone,
  members,
  compact = false,
  onDiscarded,
}: RunningCardProps & { event: EventOfType<'breast_feed'> | EventOfType<'pump'> }) {
  const now = useNow(1000);
  const { action, noun, requestDiscard, discardControls, startControls, endControls } = useSessionEditors({
    event,
    client,
    timeZone,
    now,
    onDiscarded,
  });
  const showNapPrompt = useNapPrompt();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const totals = segmentTotals(event.segments, now);
  const open = totals.open;
  const paused = open === null;
  const currentMs = open ? now.getTime() - Date.parse(open.startedAt) : 0;
  const title = event.type === 'pump' ? 'Pumping' : 'Feeding';

  const cached = () => ({
    running: queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(event.babyId)) ?? [],
    latest: queryClient.getQueryData<BabyEvent[]>(queryKeys.latestEvents(event.babyId)) ?? [],
    nappyTiming:
      queryClient.getQueryData<BabySettings>(queryKeys.babySettings(event.babyId))?.nappy_prompt ?? 'feed_start',
  });

  async function pressSide(side: Side, active: boolean) {
    const context = cached();
    const at = clock.now().toISOString();
    try {
      await action.mutateAsync({
        event,
        action: active ? { kind: 'pause' } : paused ? { kind: 'resume', side } : { kind: 'switch', side },
      });
    } catch {
      return;
    }
    if (!active) promptsForSessionEvent({ kind: 'side', event, side, at, ...context }).forEach(showNapPrompt);
  }

  async function finish(at?: string) {
    const context = cached();
    const endedAt = at ?? feedEndTime(event, clock.now());
    try {
      await action.mutateAsync({ event, action: { kind: 'end', at } });
    } catch {
      return;
    }
    if (event.type === 'pump') {
      void navigate({ to: '/events/$eventId', params: { eventId: event.id }, search: { finish: true } });
      return;
    }
    promptsForSessionEvent({ kind: 'end', event, at: endedAt, ...context }).forEach(showNapPrompt);
  }

  return (
    <Shell tone={event.type === 'pump' ? 'pump' : 'feed'} compact={compact}>
      <Header
        title={open ? `${title} · ${SIDE_LABEL[open.side]}` : `${title} · paused`}
        paused={paused}
        startedBy={startedByName(members, event)}
        eventId={event.id}
        compact={compact}
        noun={noun}
        onDiscard={requestDiscard}
      />
      {discardControls}
      <div className="flex items-baseline gap-3">
        <span className={cn('tabular text-timer-lg font-medium', paused && 'text-ink-2')}>
          {paused ? formatTimer(totals.activeMs) : formatTimer(currentMs)}
        </span>
        <span className="tabular text-meta text-ink-2">
          {paused
            ? `Paused for ${formatDuration(pausedForMs(event.segments, now) ?? 0)}`
            : `total ${formatDuration(totals.activeMs)}`}
        </span>
      </div>
      {startControls}
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map((side) => {
          const active = open?.side === side;
          return (
            <button
              key={side}
              type="button"
              aria-pressed={active}
              onClick={() => void pressSide(side, active)}
              className={cn(
                'flex min-h-tap-lg items-center gap-3 rounded-card px-4 py-3 text-left transition-colors duration-base',
                SIDE_BUTTON[side][active ? 'active' : 'idle'],
              )}
            >
              <span className="grid size-9 place-items-center rounded-full bg-black/10 text-row-title font-bold">
                {SIDE_LABEL[side][0]}
              </span>
              <span className="flex flex-col">
                <span className="text-label font-semibold">
                  {SIDE_LABEL[side]}
                  {active && ' · on'}
                  {paused && side === totals.lastSide && ' · last'}
                </span>
                <span className="tabular text-meta">
                  {formatDuration(side === 'left' ? totals.leftMs : totals.rightMs)}
                </span>
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
        <Button
          size="lg"
          onClick={() => void finish()}
          loading={action.isPending && action.variables?.action.kind === 'end'}
        >
          <Square className="size-4" strokeWidth={3} />
          Finish
        </Button>
      </div>
      {endControls((at) => void finish(at))}
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
  children: ReactNode;
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
  paused,
  startedBy,
  eventId,
  compact,
  noun,
  onDiscard,
}: {
  title: string;
  paused: boolean;
  startedBy?: string;
  eventId: string;
  compact: boolean;
  noun: string;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-3 shrink-0 place-items-center">
        {!paused && <span data-pulse className="absolute inset-0 animate-timer-pulse rounded-full bg-session-active" />}
        <span className={cn('size-3 rounded-full', paused ? 'bg-session-downtime' : 'bg-session-active')} />
      </span>
      <span className="shrink-0 text-row-title font-bold">{title}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-meta text-ink-2">
        {startedBy && (
          <>
            <Avatar name={startedBy} className="size-7 shrink-0 text-caption" />
            <span className="truncate">Started by {startedBy}</span>
          </>
        )}
      </span>
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
