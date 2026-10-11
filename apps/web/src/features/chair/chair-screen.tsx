import {
  bottleStep,
  CHAIR_UNDO_MS,
  formatBottleAmount,
  stepBottleAmount,
  type BottleContent,
  type ChairFeedView,
  type NappyType,
  type Side,
  type Units,
} from '@babble/domain';
import {
  AlarmClock,
  ArrowLeftRight,
  Check,
  Clock,
  Droplet,
  Droplets,
  Milk,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Sun,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { cn } from '#/lib/cn';

export interface ChairFeed {
  id: string;
  view: ChairFeedView;
  summary: { title: string; sides: string };
  startedLine: string;
  startedBy: string | null;
}

export interface ChairData {
  babyName: string;
  age: string;
  clock: string;
  night: boolean;
  dimmed: boolean;
  offline: boolean;
  lastFeed: string;
  due: { text: string; overdue: boolean } | null;
  suggested: Side | null;
  feed: ChairFeed | null;
  nap: string | null;
  lastNappy: string | null;
  nappyDue: boolean;
  units: Units;
  bottle: { amount: number; content: BottleContent };
}

export interface ChairActions {
  startFeed: (side: Side) => Promise<unknown>;
  switchSide: (side: Side) => void;
  pause: () => void;
  resume: (side: Side) => void;
  endFeed: () => Promise<unknown>;
  resumeFeed: (feedId: string) => Promise<unknown>;
  saveBottle: (amount: number, content: BottleContent) => Promise<string>;
  saveNappy: (type: NappyType) => Promise<string>;
  startNap: () => Promise<string>;
  endNap: () => Promise<unknown>;
  undoEntry: (eventId: string) => Promise<unknown>;
  wake: () => void;
}

type Toast = { key: number; message: string; undo?: () => Promise<unknown> };
type Ended = { id: string; title: string; sides: string };

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };
const SIDE_BG: Record<Side, string> = { left: 'bg-feed-left', right: 'bg-feed-right' };
const SIDE_SOFT: Record<Side, string> = { left: 'bg-feed-left-soft', right: 'bg-feed-right-soft' };
const SIDE_ON: Record<Side, string> = { left: 'text-on-feed-left', right: 'text-on-feed-right' };
const SIDE_RING: Record<Side, string> = {
  left: 'shadow-[0_0_0_1cqmin_rgb(var(--bg)),0_0_0_2.2cqmin_rgb(var(--feed-left))]',
  right: 'shadow-[0_0_0_1cqmin_rgb(var(--bg)),0_0_0_2.2cqmin_rgb(var(--feed-right))]',
};
const CONTENTS: { value: BottleContent; label: string }[] = [
  { value: 'breast_milk', label: 'Breast milk' },
  { value: 'formula', label: 'Formula' },
  { value: 'mixed', label: 'Mixed' },
];
const NAPPIES: { value: NappyType; label: string; icon: LucideIcon | null; poo: boolean }[] = [
  { value: 'wet', label: 'Wet', icon: Droplet, poo: false },
  { value: 'dirty', label: 'Dirty', icon: null, poo: true },
  { value: 'both', label: 'Both', icon: Droplet, poo: true },
  { value: 'dry', label: 'Dry', icon: Sun, poo: false },
];
const NAPPY_SAVED: Record<NappyType, string> = { wet: 'Wet', dirty: 'Dirty', both: 'Wet and dirty', dry: 'Dry' };

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'Something went wrong. Try again.';
}

export function ChairScreen({ data, actions }: { data: ChairData; actions: ChairActions }) {
  const [sheet, setSheet] = useState<'bottle' | 'nappy' | 'nappy-ask' | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const swallowClick = useRef(false);
  const toastKey = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), CHAIR_UNDO_MS);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!ended) return;
    const id = setTimeout(() => setEnded(null), CHAIR_UNDO_MS);
    return () => clearTimeout(id);
  }, [ended]);

  function show(message: string, undo?: () => Promise<unknown>) {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, undo });
  }

  function run(task: () => Promise<unknown>) {
    task().catch((caught: unknown) => show(errorMessage(caught)));
  }

  function endFeed(feed: ChairFeed) {
    setEnded({ id: feed.id, ...feed.summary });
    actions.endFeed().catch((caught: unknown) => {
      setEnded(null);
      show(errorMessage(caught));
    });
  }

  function saveEntry(save: () => Promise<string>, message: string) {
    setSheet(null);
    run(async () => {
      const id = await save();
      show(message, () => actions.undoEntry(id));
    });
  }

  function startFeed(side: Side) {
    const askNappy = data.nappyDue;
    run(async () => {
      await actions.startFeed(side);
      if (askNappy) setSheet('nappy-ask');
    });
  }

  function startNap() {
    run(async () => {
      const id = await actions.startNap();
      show('Nap started', () => actions.undoEntry(id));
    });
  }

  const feed = ended ? null : data.feed;

  return (
    <div
      data-theme={data.night ? 'dark' : undefined}
      data-testid="chair"
      className={cn(
        'fixed inset-0 overflow-hidden font-sans text-ink select-none [container-type:size]',
        data.dimmed && 'chair-dim',
        feed ? (feed.view.paused ? 'bg-session-paused-soft' : SIDE_SOFT[feed.view.side]) : 'bg-bg',
      )}
      onPointerDownCapture={() => {
        if (data.dimmed) swallowClick.current = true;
        actions.wake();
      }}
      onClickCapture={(event) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <div className="absolute inset-0 box-border flex flex-col gap-[3cqmin] p-[4cqmin]">
        {!ended && !data.offline && (
          <div className="flex h-[6cqmin] flex-none items-center gap-[2cqmin] text-[length:4.2cqmin] text-ink-2">
            <a href="/" aria-label={`Leave chair mode, back to ${data.babyName}'s home`} className="font-bold text-ink">
              {data.babyName}
            </a>
            <span>{data.age}</span>
            <span className="flex-1" />
            {data.dimmed && (
              <span className="flex items-center gap-[1cqmin] text-ink-3">
                <Moon className="size-[3.6cqmin]" strokeWidth={2.5} />
                Dimmed · tap to wake
              </span>
            )}
            <span className="tabular font-semibold">{data.clock}</span>
          </div>
        )}

        {data.offline ? (
          <Offline />
        ) : ended ? (
          <EndedView
            ended={ended}
            babyName={data.babyName}
            onUndo={() => {
              setEnded(null);
              run(() => actions.resumeFeed(ended.id));
            }}
            onAsleep={
              data.nap
                ? null
                : () => {
                    setEnded(null);
                    startNap();
                  }
            }
          />
        ) : feed ? (
          <FeedingView feed={feed} actions={actions} onEnd={() => endFeed(feed)} />
        ) : (
          <IdleView
            data={data}
            onStart={startFeed}
            onBottle={() => setSheet('bottle')}
            onNappy={() => setSheet('nappy')}
            onSleep={() =>
              data.nap
                ? run(async () => {
                    await actions.endNap();
                    show('Nap ended');
                  })
                : startNap()
            }
          />
        )}
      </div>

      {sheet === 'bottle' && (
        <BottleSheet
          units={data.units}
          initial={data.bottle}
          onClose={() => setSheet(null)}
          onSave={(amount, content) =>
            saveEntry(
              () => actions.saveBottle(amount, content),
              `Bottle saved · ${formatBottleAmount(amount)} ${data.units === 'metric' ? 'ml' : 'oz'}`,
            )
          }
        />
      )}
      {sheet === 'nappy-ask' && (
        <Sheet
          title={`Change ${data.babyName}'s nappy?`}
          icon={Droplets}
          tone="bg-nappy-soft text-nappy"
          onClose={() => setSheet(null)}
        >
          <div className="flex min-h-0 flex-1 flex-wrap content-end gap-[3cqmin] text-[length:6cqmin]">
            <BigButton
              onClick={() => setSheet(null)}
              className="h-[24cqmin] flex-[1_1_30cqmin] rounded-[5cqmin] border-[0.5cqmin] border-line-strong bg-raised"
            >
              Not now
            </BigButton>
            <BigButton
              onClick={() => setSheet('nappy')}
              className="h-[24cqmin] flex-[2_1_50cqmin] rounded-[5cqmin] bg-nappy text-ink-on-solid"
            >
              <Droplets className="size-[6.4cqmin]" strokeWidth={2.75} />
              Yes, log a nappy
            </BigButton>
          </div>
        </Sheet>
      )}
      {sheet === 'nappy' && (
        <NappySheet
          onClose={() => setSheet(null)}
          onPick={(type) => saveEntry(() => actions.saveNappy(type), `Nappy saved · ${NAPPY_SAVED[type]}`)}
        />
      )}

      {toast && (
        <div
          key={toast.key}
          role="status"
          className={cn(
            'absolute top-[3cqmin] left-1/2 flex -translate-x-1/2 items-center gap-[4cqmin] rounded-full border-[0.3cqmin] border-line-strong bg-raised py-[1.4cqmin] pl-[4cqmin] whitespace-nowrap shadow-toast',
            toast.undo ? 'pr-[1.4cqmin]' : 'min-h-[12cqmin] pr-[5cqmin]',
          )}
        >
          <Check className="size-[5.4cqmin] text-success" strokeWidth={2.75} />
          <span className="text-[length:5.4cqmin] font-bold">{toast.message}</span>
          {toast.undo ? (
            <BigButton
              className="h-[18.4cqmin] rounded-full bg-primary-soft px-[6cqmin] text-on-primary-soft"
              onClick={() => {
                const undo = toast.undo!;
                setToast(null);
                run(undo);
              }}
            >
              <Undo2 className="size-[5.4cqmin]" strokeWidth={2.75} />
              Undo
            </BigButton>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BigButton({
  className,
  children,
  onClick,
  label,
}: {
  className: string;
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'box-border flex items-center justify-center gap-[2cqmin] font-bold active:brightness-90',
        className,
      )}
    >
      {children}
    </button>
  );
}

function IdleView({
  data,
  onStart,
  onBottle,
  onNappy,
  onSleep,
}: {
  data: ChairData;
  onStart: (side: Side) => void;
  onBottle: () => void;
  onNappy: () => void;
  onSleep: () => void;
}) {
  const quick: {
    label: string;
    detail?: string | null;
    icon: LucideIcon;
    onClick: () => void;
    className: string;
    iconClass: string;
  }[] = [
    {
      label: 'Bottle',
      icon: Milk,
      onClick: onBottle,
      className: 'bg-bottle-soft text-on-bottle',
      iconClass: 'text-bottle',
    },
    {
      label: 'Nappy',
      detail: data.lastNappy,
      icon: Droplets,
      onClick: onNappy,
      className: 'bg-nappy-soft text-on-nappy',
      iconClass: 'text-nappy',
    },
    {
      label: data.nap ? `End nap · ${data.nap}` : 'Sleep',
      icon: Moon,
      onClick: onSleep,
      className: 'bg-sleep-soft text-on-sleep',
      iconClass: 'text-sleep',
    },
  ];
  return (
    <>
      <div className="flex flex-none flex-col items-start gap-[1.6cqmin]">
        <span className="tabular text-[length:5.8cqmin] leading-tight font-semibold">{data.lastFeed}</span>
        {data.due && (
          <span
            className={cn(
              'tabular flex items-center gap-[1.4cqmin] rounded-full px-[2.6cqmin] py-[1.2cqmin] text-[length:4.4cqmin] font-semibold',
              data.due.overdue ? 'bg-caution-soft text-on-caution' : 'bg-info-soft text-on-info',
            )}
          >
            {data.due.overdue ? (
              <AlarmClock className="size-[4.4cqmin] text-caution" strokeWidth={2.5} />
            ) : (
              <Clock className="size-[4.4cqmin] text-info" strokeWidth={2.5} />
            )}
            {data.due.text}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 gap-[3cqmin]">
        {(['left', 'right'] as const).map((side) => (
          <BigButton
            key={side}
            label={`Start ${side}`}
            onClick={() => onStart(side)}
            className={cn(
              'relative flex-1 flex-col gap-[1.4cqmin] rounded-[5cqmin] text-ink-on-solid',
              SIDE_BG[side],
              data.suggested === side && SIDE_RING[side],
            )}
          >
            {data.suggested === side && (
              <span className="absolute top-[2.4cqmin] right-[2.4cqmin] flex h-[6.4cqmin] items-center rounded-full bg-raised px-[2.6cqmin] text-[length:4cqmin] font-bold text-ink">
                Next
              </span>
            )}
            <span className="text-[length:24cqmin] leading-[0.9]">{side === 'left' ? 'L' : 'R'}</span>
            <span className="flex items-center gap-[1.4cqmin] text-[length:5.4cqmin]">
              <Play className="size-[4.6cqmin]" strokeWidth={3} />
              Start {side}
            </span>
          </BigButton>
        ))}
      </div>
      <div className="flex flex-none gap-[3cqmin]">
        {quick.map((item) => (
          <BigButton
            key={item.label}
            onClick={item.onClick}
            className={cn('h-[19cqmin] flex-1 rounded-[4cqmin] text-[length:5.4cqmin]', item.className)}
          >
            <item.icon className={cn('size-[6.4cqmin] flex-none', item.iconClass)} strokeWidth={2.5} />
            {item.detail ? (
              <span className="flex min-w-0 flex-col items-start leading-tight">
                {item.label}
                <span className="tabular truncate text-[length:3.6cqmin] font-semibold opacity-80">{item.detail}</span>
              </span>
            ) : (
              item.label
            )}
          </BigButton>
        ))}
      </div>
    </>
  );
}

function FeedingView({ feed, actions, onEnd }: { feed: ChairFeed; actions: ChairActions; onEnd: () => void }) {
  const { view } = feed;
  const other = view.side === 'left' ? 'right' : 'left';
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-[1.8cqmin]">
        <span
          className={cn(
            'flex items-center gap-[2cqmin] rounded-full bg-raised/70 py-[1.2cqmin] pr-[3cqmin] pl-[2.6cqmin] text-[length:5cqmin] font-bold',
            view.paused ? 'text-on-session-paused' : SIDE_ON[view.side],
          )}
        >
          <span className="relative size-[2.6cqmin] flex-none">
            {!view.paused && (
              <span
                data-pulse
                className={cn('absolute inset-0 animate-timer-pulse rounded-full', SIDE_BG[view.side])}
              />
            )}
            <span
              className={cn('absolute inset-0 rounded-full', view.paused ? 'bg-session-paused' : SIDE_BG[view.side])}
            />
          </span>
          {view.title}
        </span>
        <div className="flex flex-wrap items-center gap-[4cqmin]">
          <span
            role="timer"
            className={cn(
              'tabular text-[length:22cqmin] leading-none font-semibold tracking-tight',
              view.paused && 'opacity-45',
            )}
          >
            {view.timer}
          </span>
          {view.pausedFor && (
            <span className="flex h-[9cqmin] items-center gap-[1.4cqmin] rounded-full bg-session-paused px-[3cqmin] text-[length:4.6cqmin] font-bold text-ink-on-solid">
              <Pause className="size-[4.4cqmin]" strokeWidth={2.75} />
              {view.pausedFor}
            </span>
          )}
        </div>
        <span className="tabular text-[length:6cqmin] font-semibold text-ink-2">{view.sides}</span>
        <span className="flex items-center gap-[1.6cqmin] text-[length:4.2cqmin] text-ink-2">
          {feed.startedBy && <Avatar name={feed.startedBy} className="size-[6cqmin] text-[length:2.6cqmin]" />}
          {feed.startedLine}
        </span>
      </div>
      <div className="flex flex-none flex-wrap gap-[3cqmin] text-[length:5.6cqmin]">
        <BigButton
          onClick={() => actions.switchSide(other)}
          className={cn('h-[20cqmin] flex-[1.4_1_50cqmin] rounded-[4cqmin] text-ink-on-solid', SIDE_BG[other])}
        >
          <ArrowLeftRight className="size-[6cqmin]" strokeWidth={2.75} />
          Switch to {SIDE_LABEL[other]}
        </BigButton>
        <BigButton
          onClick={() => (view.paused ? actions.resume(view.side) : actions.pause())}
          className={cn(
            'h-[20cqmin] flex-[1_1_25cqmin] rounded-[4cqmin]',
            view.paused
              ? 'bg-session-paused text-ink-on-solid'
              : 'border-[0.5cqmin] border-line-strong bg-raised text-ink',
          )}
        >
          {view.paused ? (
            <Play className="size-[6cqmin]" strokeWidth={2.75} />
          ) : (
            <Pause className="size-[6cqmin]" strokeWidth={2.75} />
          )}
          {view.paused ? 'Resume' : 'Pause'}
        </BigButton>
        <BigButton
          onClick={onEnd}
          className="h-[20cqmin] flex-[1_1_25cqmin] rounded-[4cqmin] bg-primary text-on-primary"
        >
          <Check className="size-[6cqmin]" strokeWidth={2.75} />
          End feed
        </BigButton>
      </div>
    </>
  );
}

function EndedView({
  ended,
  babyName,
  onUndo,
  onAsleep,
}: {
  ended: Ended;
  babyName: string;
  onUndo: () => void;
  onAsleep: (() => void) | null;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-[2.4cqmin] text-center">
        <span className="grid size-[20cqmin] place-items-center rounded-full bg-success text-ink-on-solid">
          <Check className="size-[11cqmin]" strokeWidth={2.75} />
        </span>
        <span className="tabular text-[length:13cqmin] leading-none font-bold">{ended.title}</span>
        {ended.sides && <span className="tabular text-[length:6cqmin] font-semibold text-ink-2">{ended.sides}</span>}
      </div>
      <div className="flex flex-none flex-wrap gap-[3cqmin] text-[length:5.6cqmin]">
        <BigButton
          onClick={onUndo}
          className="h-[20cqmin] flex-[1_1_30cqmin] rounded-[4cqmin] border-[0.5cqmin] border-line-strong bg-raised"
        >
          <Undo2 className="size-[6cqmin]" strokeWidth={2.75} />
          Undo
        </BigButton>
        {onAsleep && (
          <BigButton
            onClick={onAsleep}
            className="h-[20cqmin] flex-[2_1_50cqmin] rounded-[4cqmin] bg-sleep text-[length:5.8cqmin] text-ink-on-solid"
          >
            <Moon className="size-[6.4cqmin]" strokeWidth={2.75} />
            {babyName}'s asleep
          </BigButton>
        )}
      </div>
      <span className="flex-none self-center text-[length:3.8cqmin] text-ink-2">Back to the start screen in 5s</span>
    </>
  );
}

function Offline() {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-[3cqmin] text-center">
      <span
        data-spin
        className="box-border size-[13cqmin] animate-spin rounded-full border-[1.6cqmin] border-line border-t-primary"
      />
      <span className="text-[length:8cqmin] leading-tight font-bold">Can't reach babble.</span>
      <span className="text-[length:5.4cqmin] text-ink-2">Retrying…</span>
    </div>
  );
}

function Sheet({
  title,
  icon: Icon,
  tone,
  onClose,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-scrim/55" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="absolute inset-x-[3cqmin] top-[5cqmin] bottom-[3cqmin] box-border flex flex-col gap-[3cqmin] rounded-[6cqmin] bg-raised p-[4cqmin] shadow-sheet"
      >
        <div className="flex flex-none items-center gap-[3cqmin]">
          <span className={cn('grid size-[12cqmin] place-items-center rounded-full', tone)}>
            <Icon className="size-[6.4cqmin]" strokeWidth={2.5} />
          </span>
          <span className="flex-1 text-[length:8cqmin] font-bold">{title}</span>
          <BigButton label="Close" onClick={onClose} className="size-[18.4cqmin] rounded-full bg-surface">
            <X className="size-[7cqmin]" strokeWidth={2.75} />
          </BigButton>
        </div>
        {children}
      </div>
    </>
  );
}

function BottleSheet({
  units,
  initial,
  onClose,
  onSave,
}: {
  units: Units;
  initial: ChairData['bottle'];
  onClose: () => void;
  onSave: (amount: number, content: BottleContent) => void;
}) {
  const [amount, setAmount] = useState(initial.amount);
  const [content, setContent] = useState(initial.content);
  const unit = units === 'metric' ? 'ml' : 'oz';
  const step = formatBottleAmount(bottleStep(units));
  const stepper = (direction: 1 | -1) => (
    <BigButton
      label={`${direction === 1 ? 'More' : 'Less'}, ${step} ${unit}`}
      onClick={() => setAmount(stepBottleAmount(amount, direction, units))}
      className="size-[22cqmin] flex-none flex-col gap-0 rounded-full border-[0.5cqmin] border-line-strong bg-surface"
    >
      {direction === 1 ? (
        <Plus className="size-[8cqmin]" strokeWidth={2.75} />
      ) : (
        <Minus className="size-[8cqmin]" strokeWidth={2.75} />
      )}
      <span className="text-[length:3.6cqmin] text-ink-2">{step}</span>
    </BigButton>
  );
  return (
    <Sheet title="Bottle" icon={Milk} tone="bg-bottle-soft text-bottle" onClose={onClose}>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-[5cqmin]">
        {stepper(-1)}
        <span
          aria-live="polite"
          className="tabular min-w-[44cqmin] text-center text-[length:18cqmin] leading-none font-bold"
        >
          {formatBottleAmount(amount)}
          <span className="ml-[1.4cqmin] text-[length:7cqmin] font-semibold text-ink-2">{unit}</span>
        </span>
        {stepper(1)}
      </div>
      <div className="flex flex-none flex-wrap gap-[3cqmin]">
        <div role="radiogroup" aria-label="Contents" className="flex flex-[3_1_90cqmin] gap-[2cqmin]">
          {CONTENTS.map((option) => {
            const selected = option.value === content;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setContent(option.value)}
                className={cn(
                  'box-border flex h-[18.4cqmin] flex-1 items-center justify-center gap-[1.2cqmin] rounded-full border-[0.5cqmin] text-[length:4.8cqmin] font-bold whitespace-nowrap',
                  selected
                    ? 'border-primary bg-primary-soft text-on-primary-soft'
                    : 'border-line-strong bg-raised text-ink',
                )}
              >
                {selected && <Check className="size-[4.6cqmin]" strokeWidth={3} />}
                {option.label}
              </button>
            );
          })}
        </div>
        <BigButton
          onClick={() => onSave(amount, content)}
          className="h-[18.4cqmin] flex-[1_1_40cqmin] rounded-full bg-primary text-[length:6cqmin] text-on-primary"
        >
          <Check className="size-[6.4cqmin]" strokeWidth={2.75} />
          Save
        </BigButton>
      </div>
    </Sheet>
  );
}

function NappySheet({ onClose, onPick }: { onClose: () => void; onPick: (type: NappyType) => void }) {
  return (
    <Sheet title="Nappy" icon={Droplets} tone="bg-nappy-soft text-nappy" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-wrap content-stretch gap-[3cqmin]">
        {NAPPIES.map((option) => (
          <BigButton
            key={option.value}
            onClick={() => onPick(option.value)}
            className="min-h-[28cqmin] flex-[1_1_34cqmin] flex-col rounded-[5cqmin] bg-nappy-soft text-on-nappy"
          >
            <span className="flex h-[11cqmin] items-center gap-[1.4cqmin]">
              {option.icon && <option.icon className="size-[10cqmin] text-nappy" strokeWidth={2.5} />}
              {option.poo && (
                <span className="size-[9cqmin] rounded-full bg-poo-mustard shadow-[inset_0_0_0_0.5cqmin_rgb(var(--swatch-edge)/0.6)]" />
              )}
            </span>
            <span className="text-[length:7cqmin]">{option.label}</span>
          </BigButton>
        ))}
      </div>
    </Sheet>
  );
}
