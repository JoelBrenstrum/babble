import { weekdayLabel, TIMELINE_LANES, type DayLayout, type TimelineLane } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '#/lib/cn';

const pct = (frac: number) => `${(frac * 100).toFixed(3)}%`;

export function MonthTimeline({
  days,
  ticks,
  todayKey,
  linkDays = true,
  lanes = TIMELINE_LANES,
  show,
}: {
  days: { dayKey: string; layout: DayLayout | null }[];
  ticks: { frac: number; label: string }[];
  todayKey: string;
  linkDays?: boolean;
  lanes?: readonly TimelineLane[];
  show?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-16 text-meta font-semibold text-ink-2">
        {lanes.includes('sleep') && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-sleep" />
            Sleep
          </span>
        )}
        {lanes.includes('feeds') && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded-full bg-feed-left" />
              Left
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded-full bg-feed-right" />
              Right
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded-full bg-bottle" />
              Bottle
            </span>
          </>
        )}
      </div>
      <div className="grid grid-cols-[4rem_minmax(0,1fr)]">
        <span />
        <div className="relative h-4">
          {ticks.map((tick, index) => (
            <span
              key={index}
              className={cn(
                'tabular absolute top-0 text-caption text-ink-3',
                index === 0 ? '' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: pct(tick.frac) }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
      <ol className="flex flex-col gap-[3px]" aria-label="Days">
        {days.map(({ dayKey, layout }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          const today = dayKey === todayKey;
          return (
            <li key={dayKey}>
              <RowLink dayKey={dayKey} label={`Open ${weekday} ${day}`} enabled={linkDays} show={show}>
                <span
                  className={cn(
                    'tabular truncate pr-2 text-caption',
                    today ? 'font-bold text-primary' : 'text-ink-3',
                    weekday === 'Mon' && !today && 'font-semibold text-ink-2',
                  )}
                >
                  {`${weekday} ${day}`}
                </span>
                <span
                  className={cn(
                    'relative h-full overflow-hidden rounded-sm bg-surface group-hover:ring-2 group-hover:ring-line-strong',
                    today && 'ring-1 ring-primary',
                    !layout && 'opacity-50',
                  )}
                >
                  {ticks.slice(1, -1).map((tick, index) => (
                    <span
                      key={`tick-${index}`}
                      className="absolute inset-y-0 w-px bg-line"
                      style={{ left: pct(tick.frac) }}
                    />
                  ))}
                  {layout?.sleep.map((item) => (
                    <span
                      key={item.event.id}
                      className="absolute inset-y-0 min-w-[2px] bg-sleep"
                      style={{ left: pct(item.startFrac), width: pct(item.endFrac - item.startFrac) }}
                    />
                  ))}
                  {layout?.feeds.flatMap((item) =>
                    item.event.type === 'solids'
                      ? []
                      : item.parts.length > 0
                        ? item.parts.map((part, index) => (
                            <span
                              key={`${item.event.id}-${index}`}
                              className={cn(
                                'absolute inset-y-[3px] min-w-[2px] rounded-full',
                                part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right',
                              )}
                              style={{ left: pct(part.startFrac), width: pct(part.endFrac - part.startFrac) }}
                            />
                          ))
                        : [
                            <span
                              key={item.event.id}
                              className={cn(
                                'absolute inset-y-[3px] w-[2px] rounded-full',
                                item.event.type === 'bottle' ? 'bg-bottle' : 'bg-feed-right',
                              )}
                              style={{ left: pct(item.startFrac) }}
                            />,
                          ],
                  )}
                </span>
              </RowLink>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RowLink({
  dayKey,
  label,
  enabled,
  show,
  children,
}: {
  dayKey: string;
  label: string;
  enabled: boolean;
  show?: string;
  children: ReactNode;
}) {
  const className = 'group grid h-4 grid-cols-[4rem_minmax(0,1fr)] items-center md:h-5';
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <Link to="/timeline" search={{ view: 'day', date: dayKey, show }} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
