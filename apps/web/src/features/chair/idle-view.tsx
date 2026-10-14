import type { Side } from '@babble/domain';
import { AlarmClock, Clock, Droplets, Milk, Moon, Pause, Play, type LucideIcon } from 'lucide-react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { SIDE_BG, SIDE_RING } from './styles';
import type { ChairData } from './types';

const SIDES: readonly Side[] = ['left', 'right'];

interface QuickAction {
  label: string;
  detail?: string | null;
  icon: LucideIcon;
  onClick: () => void;
  className: string;
  iconClass: string;
  split?: { label: string; icon: LucideIcon; onClick: () => void; className: string };
}

export function IdleView({
  data,
  onStart,
  onBottle,
  onNappy,
  onSleep,
  onPauseNap,
}: {
  data: ChairData;
  onStart: (side: Side) => void;
  onBottle: () => void;
  onNappy: () => void;
  onSleep: () => void;
  onPauseNap: () => void;
}) {
  const quick: QuickAction[] = [
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
      label: data.nap ? `End nap · ${data.nap.asleep}` : 'Sleep',
      detail: data.nap?.paused ? 'Awake · paused' : null,
      icon: Moon,
      onClick: onSleep,
      className: 'bg-sleep-soft text-on-sleep',
      iconClass: 'text-sleep',
      split: data.nap
        ? {
            label: data.nap.paused ? 'Resume nap' : 'Pause nap',
            icon: data.nap.paused ? Play : Pause,
            onClick: onPauseNap,
            className: data.nap.paused ? 'bg-session-paused text-ink-on-solid' : 'bg-sleep-soft text-sleep',
          }
        : undefined,
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
        {SIDES.map((side) => (
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
        {quick.map((item) => {
          const content = (
            <>
              <item.icon className={cn('size-[6.4cqmin] flex-none', item.iconClass)} strokeWidth={2.5} />
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-full truncate">{item.label}</span>
                {item.detail && (
                  <span className="tabular max-w-full truncate text-[length:3.6cqmin] font-semibold opacity-80">
                    {item.detail}
                  </span>
                )}
              </span>
            </>
          );
          if (!item.split) {
            return (
              <BigButton
                key={item.label}
                onClick={item.onClick}
                className={cn('h-[19cqmin] min-w-0 flex-1 rounded-[4cqmin] text-[length:5.4cqmin]', item.className)}
              >
                {content}
              </BigButton>
            );
          }
          const { split } = item;
          return (
            <div key={item.label} className="flex h-[19cqmin] min-w-0 flex-[1.45_1_0%] gap-[0.6cqmin]">
              <BigButton
                onClick={item.onClick}
                className={cn(
                  'min-w-0 flex-1 rounded-l-[4cqmin] rounded-r-[1.2cqmin] text-[length:5.4cqmin]',
                  item.className,
                )}
              >
                {content}
              </BigButton>
              <BigButton
                label={split.label}
                onClick={split.onClick}
                className={cn('w-[14cqmin] flex-none rounded-l-[1.2cqmin] rounded-r-[4cqmin]', split.className)}
              >
                <split.icon className="size-[6.4cqmin]" strokeWidth={2.5} />
              </BigButton>
            </div>
          );
        })}
      </div>
    </>
  );
}
