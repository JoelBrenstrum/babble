import { SIDE_LABEL, otherSide, type ChairFeed, type Side } from '@babble/domain';
import { ArrowLeftRight, Check, Pause, Play, Trash2 } from 'lucide-react';
import { Avatar } from '#/components/ui/avatar';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { ACTION_BUTTON, ACTION_ICON, ACTION_ROW, OUTLINED, SIDE_BG, SIDE_ON } from './styles';
import type { ChairActions } from './types';

export function FeedingView({
  feed,
  actions,
  onEnd,
  onSwitch,
  onDiscard,
}: {
  feed: ChairFeed;
  actions: Pick<ChairActions, 'pause' | 'resume'>;
  onEnd: () => void;
  onSwitch: (side: Side) => void;
  onDiscard: () => void;
}) {
  const { view } = feed;
  const other = otherSide(view.side);
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
        <span className="tabular flex flex-wrap items-center gap-x-[3cqmin] text-[length:6cqmin] font-semibold text-ink-2">
          {view.sides}
          {view.idle && (
            <span className="flex items-center gap-[1.4cqmin] text-on-session-downtime">
              <span className="size-[3cqmin] rounded-full border-[0.6cqmin] border-dashed border-session-downtime" />
              {view.idle}
            </span>
          )}
        </span>
        <div className="flex w-full items-center gap-[3cqmin]">
          <span className="flex min-w-0 flex-1 items-center gap-[1.6cqmin] text-[length:4.2cqmin] text-ink-2">
            {feed.startedBy && <Avatar name={feed.startedBy} className="size-[6cqmin] text-[length:2.6cqmin]" />}
            {feed.startedLine}
          </span>
          <BigButton
            onClick={onDiscard}
            className="h-[12cqmin] flex-none rounded-full border-[0.4cqmin] border-line-strong bg-raised/70 px-[4cqmin] text-[length:4.4cqmin] text-ink-2"
          >
            <Trash2 className="size-[4.6cqmin]" strokeWidth={2.5} />
            Discard
          </BigButton>
        </div>
      </div>
      <div className={ACTION_ROW}>
        <BigButton
          onClick={() => onSwitch(other)}
          className={cn(ACTION_BUTTON, 'flex-[1.4_1_50cqmin] text-ink-on-solid', SIDE_BG[other])}
        >
          <ArrowLeftRight className={ACTION_ICON} strokeWidth={2.75} />
          Switch to {SIDE_LABEL[other]}
        </BigButton>
        <BigButton
          onClick={() => (view.paused ? actions.resume(view.side) : actions.pause())}
          className={cn(
            ACTION_BUTTON,
            'flex-[1_1_25cqmin]',
            view.paused ? 'bg-session-paused text-ink-on-solid' : `${OUTLINED} text-ink`,
          )}
        >
          {view.paused ? (
            <Play className={ACTION_ICON} strokeWidth={2.75} />
          ) : (
            <Pause className={ACTION_ICON} strokeWidth={2.75} />
          )}
          {view.paused ? 'Resume' : 'Pause'}
        </BigButton>
        <BigButton onClick={onEnd} className={cn(ACTION_BUTTON, 'flex-[1_1_25cqmin] bg-primary text-on-primary')}>
          <Check className={ACTION_ICON} strokeWidth={2.75} />
          End feed
        </BigButton>
      </div>
    </>
  );
}
