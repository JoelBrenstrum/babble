import { formatShortDate, type StatsCard } from '@babble/domain';
import { Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';

const LOOK: Record<StatsCard['key'], { icon: LucideIcon; tile: string; series: string[] }> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft text-on-sleep', series: ['bg-sleep', 'bg-sleep/45'] },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft text-on-feed-right', series: ['bg-feed-right', 'bg-bottle'] },
  nappies: { icon: Droplets, tile: 'bg-nappy-soft text-on-nappy', series: ['bg-nappy/45', 'bg-nappy'] },
  pump: { icon: GlassWater, tile: 'bg-pump-soft text-on-pump', series: ['bg-pump'] },
};

const dayLabel = (key: string) => formatShortDate(`${key}T12:00:00Z`, 'UTC');

function axisValue(value: number, unit: string): string {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return unit === 'h' ? `${rounded}h` : unit ? `${rounded} ${unit}` : String(rounded);
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
            {chart.series.map((name, index) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-sm', look.series[index])} />
                {name}
              </span>
            ))}
          </span>
          {chart.max > 0 && (
            <span>{`${chart.weekly ? 'weekly avg, ' : ''}max ${axisValue(chart.max, chart.unit)}`}</span>
          )}
        </div>
        <div
          className="flex h-32 items-end gap-[3px] border-b border-line"
          role="img"
          aria-label={`${card.title} per day`}
        >
          {chart.bars.map((bar) => {
            const total = bar.values.reduce((sum, value) => sum + value, 0);
            return (
              <div
                key={bar.label}
                className="flex h-full min-w-0 flex-1 flex-col-reverse"
                title={`${chart.weekly ? 'Week of ' : ''}${dayLabel(bar.label)}: ${bar.values.map((value, index) => `${chart.series[index]} ${axisValue(value, chart.unit)}`).join(', ')}`}
              >
                {bar.values.map((value, index) => (
                  <div
                    key={index}
                    className={cn(look.series[index], index === bar.values.length - 1 && 'rounded-t-sm')}
                    style={{ height: chart.max ? `${(value / chart.max) * 100}%` : 0 }}
                  />
                ))}
                {total === 0 && <div className="h-px bg-line" />}
              </div>
            );
          })}
        </div>
        {chart.bars.length > 0 && (
          <div className="flex justify-between text-caption text-ink-3">
            <span>{dayLabel(chart.bars[0]!.label)}</span>
            <span>{dayLabel(chart.bars.at(-1)!.label)}</span>
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
