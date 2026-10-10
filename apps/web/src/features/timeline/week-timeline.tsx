import { weekdayLabel, type DayLayout } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { cn } from '#/lib/cn';

const pct = (frac: number) => `${(frac * 100).toFixed(3)}%`;

export function WeekTimeline({
  days,
  ticks,
  todayKey,
}: {
  days: { dayKey: string; layout: DayLayout | null }[];
  ticks: { frac: number; label: string }[];
  todayKey: string;
}) {
  const columns = { gridTemplateColumns: '2rem repeat(7, minmax(0, 1fr))' };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-8 text-meta font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sleep" />
          Sleep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-2.5 rounded-full bg-feed-left" />
          Left
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-2.5 rounded-full bg-feed-right" />
          Right
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-2.5 rounded-full bg-bottle" />
          Bottle
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-nappy" />
          Nappy
        </span>
      </div>
      <div className="grid h-[28rem] gap-1.5 md:h-[34rem]" style={columns}>
        <div className="relative">
          {ticks.map((tick, index) => (
            <span
              key={index}
              className="tabular absolute left-0 -translate-y-1/2 text-caption text-ink-3"
              style={{ top: pct(tick.frac) }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        {days.map(({ dayKey, layout }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          return (
            <Link
              key={dayKey}
              to="/timeline"
              search={{ view: 'day', date: dayKey }}
              aria-label={`Open ${weekday} ${day}`}
              className={cn(
                'relative overflow-hidden rounded-tile bg-surface hover:ring-2 hover:ring-line-strong',
                dayKey === todayKey && 'ring-2 ring-primary hover:ring-primary',
                !layout && 'opacity-50',
              )}
            >
              {layout?.sleep.map((item) => (
                <span
                  key={item.event.id}
                  className="absolute inset-x-[3px] min-h-[2px] rounded-sm bg-sleep"
                  style={{ top: pct(item.startFrac), height: pct(item.endFrac - item.startFrac) }}
                />
              ))}
              {layout?.feeds.map((item) =>
                item.parts.length > 0 ? (
                  item.parts.map((part, index) => (
                    <span
                      key={`${item.event.id}-${index}`}
                      className={cn(
                        'absolute inset-x-[30%] min-h-[3px] rounded-full',
                        part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right',
                      )}
                      style={{ top: pct(part.startFrac), height: pct(part.endFrac - part.startFrac) }}
                    />
                  ))
                ) : (
                  <span
                    key={item.event.id}
                    className={cn(
                      'absolute inset-x-[30%] h-[3px] rounded-full',
                      item.event.type === 'bottle'
                        ? 'bg-bottle'
                        : item.event.type === 'solids'
                          ? 'bg-solids'
                          : 'bg-feed-right',
                    )}
                    style={{ top: pct(item.startFrac) }}
                  />
                ),
              )}
              {layout?.nappies.map((item) => (
                <span
                  key={item.event.id}
                  className="absolute right-[3px] size-1.5 -translate-y-1/2 rounded-full bg-nappy"
                  style={{ top: pct(item.startFrac) }}
                />
              ))}
            </Link>
          );
        })}
      </div>
      <div className="grid gap-1.5" style={columns}>
        <span />
        {days.map(({ dayKey }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          return (
            <span key={dayKey} className="flex flex-col items-center leading-tight">
              <span className={cn('text-label font-bold', dayKey === todayKey ? 'text-primary' : 'text-ink')}>
                {weekday}
              </span>
              <span className="tabular text-caption text-ink-3">{day}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
