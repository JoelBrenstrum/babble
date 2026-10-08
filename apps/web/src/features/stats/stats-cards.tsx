import { barAnchor, barReadout, chartDayLabel, chartValue, topSegment, type StatsCard } from '@babble/domain';
import { Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Card } from '#/components/ui/card';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';

const LOOK: Record<StatsCard['key'], { icon: LucideIcon; tile: string; series: string[] }> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft text-on-sleep', series: ['bg-sleep', 'bg-sleep/45'] },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft text-on-feed-right', series: ['bg-bottle', 'bg-feed-right'] },
  nappies: { icon: Droplets, tile: 'bg-nappy-soft text-on-nappy', series: ['bg-nappy/35', 'bg-nappy/65', 'bg-nappy'] },
  pump: { icon: GlassWater, tile: 'bg-pump-soft text-on-pump', series: ['bg-pump'] },
};

function tipPosition(index: number, count: number) {
  const anchor = barAnchor(index, count);
  return {
    className: anchor.edge === 'center' ? '-translate-x-1/2' : '',
    style: { [anchor.edge === 'right' ? 'right' : 'left']: `${anchor.percent}%` },
  };
}

export function StatsCards({ cards }: { cards: StatsCard[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <StatsCardView key={card.key} card={card} />
      ))}
    </div>
  );
}

function StatsCardView({ card }: { card: StatsCard }) {
  const look = LOOK[card.key];
  const { chart } = card;
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(chart.bars.length - 1);
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const tabStop = Math.min(focusIndex, chart.bars.length - 1);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : event.key === 'Home' ? 0 : -2;
    const target = event.key === 'End' ? chart.bars.length - 1 : next;
    if (target < 0 || target >= chart.bars.length) return;
    event.preventDefault();
    setFocusIndex(target);
    bars.current[target]?.focus();
  };

  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby={`stats-${card.key}`}>
      <div className="flex items-center gap-3">
        <span className={cn('grid size-9 place-items-center rounded-full', look.tile)}>
          <look.icon className="size-4" strokeWidth={2.75} />
        </span>
        <h2 id={`stats-${card.key}`} className="text-row-title font-semibold">
          {card.title}
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {card.figures.map((figure) => (
          <div key={figure.label} className="flex flex-col rounded-tile bg-surface px-3 py-2">
            <dt className="text-caption text-ink-2">{figure.label}</dt>
            <dd className="tabular text-label font-semibold">{figure.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-caption text-ink-3">
          <span className="flex gap-3">
            {chart.legend.map((index) => (
              <span key={index} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-sm', look.series[index])} />
                {chart.series[index]}
              </span>
            ))}
          </span>
          {chart.max > 0 && (
            <span>{`${chart.weekly ? 'weekly avg, ' : ''}max ${chartValue(chart.max, chart.unit)}`}</span>
          )}
        </div>
        <div
          className="relative flex h-32 items-end gap-[3px] border-b border-line"
          role="group"
          aria-label={`${card.title} per day`}
        >
          {chart.bars.map((bar, index) => {
            const total = bar.values.reduce((sum, value) => sum + value, 0);
            const top = topSegment(bar.values);
            return (
              <div
                key={bar.label}
                ref={(element) => {
                  bars.current[index] = element;
                }}
                role="img"
                aria-label={barReadout(chart, bar)}
                tabIndex={index === tabStop ? 0 : -1}
                className={cn(
                  'flex h-full min-w-0 flex-1 flex-col-reverse rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active === index && 'opacity-80',
                )}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => {
                  setActive(index);
                  setFocusIndex(index);
                }}
                onBlur={() => setActive(null)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {bar.values.map((value, index) => (
                  <div
                    key={index}
                    className={cn(look.series[index], index === top && 'rounded-t-sm')}
                    style={{ height: chart.max ? `${(value / chart.max) * 100}%` : 0 }}
                  />
                ))}
                {total === 0 && <div className="h-px bg-line" />}
              </div>
            );
          })}
          {active !== null && chart.bars[active] && (
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-full rounded-[10px] bg-ink px-2.5 py-1.5 text-caption font-semibold text-bg shadow-toast',
                tipPosition(active, chart.bars.length).className,
              )}
              style={tipPosition(active, chart.bars.length).style}
            >
              {barReadout(chart, chart.bars[active])}
            </div>
          )}
        </div>
        {chart.bars.length > 0 && (
          <div className="flex justify-between text-caption text-ink-3">
            <span>{chartDayLabel(chart.bars[0]!.label)}</span>
            <span>{chartDayLabel(chart.bars.at(-1)!.label)}</span>
          </div>
        )}
      </div>
      {card.colours && card.colours.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-ink-2">Recent poo colours, newest first</span>
          <div className="flex flex-wrap gap-1.5">
            {card.colours.map((colour, index) => (
              <PooSwatch key={index} colours={[colour]} className="size-5" />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
