import {
  barAnchor,
  barReadout,
  chartEnds,
  chartValue,
  nextBarIndex,
  statsBarLink,
  topSegment,
  type StatsCard,
} from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { Droplets, GlassWater, Heart, Hourglass, Moon, MoonStar, Sun, TrendingUp, type LucideIcon } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Card } from '#/components/ui/card';
import { ChartTip } from '#/components/ui/chart-tip';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { PlusBadge } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';

const LOOK: Record<StatsCard['key'], { icon: LucideIcon; tile: string; series: string[] }> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft text-on-sleep', series: ['bg-sleep', 'bg-sleep/45'] },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft text-on-feed-right', series: ['bg-bottle', 'bg-feed-right'] },
  nappies: { icon: Droplets, tile: 'bg-nappy-soft text-on-nappy', series: ['bg-nappy/35', 'bg-nappy/65', 'bg-nappy'] },
  pump: { icon: GlassWater, tile: 'bg-pump-soft text-on-pump', series: ['bg-pump'] },
  wake: { icon: Sun, tile: 'bg-primary-soft text-on-primary-soft', series: ['bg-primary'] },
  night: { icon: MoonStar, tile: 'bg-sleep-soft text-on-sleep', series: ['bg-sleep'] },
  'feed-trend': {
    icon: TrendingUp,
    tile: 'bg-feed-left-soft text-on-feed-left',
    series: ['bg-feed-left', 'bg-feed-right', 'bg-session-downtime'],
  },
  'feed-spacing': { icon: Hourglass, tile: 'bg-bottle-soft text-on-bottle', series: ['bg-bottle'] },
};

const CHART_LABEL: Partial<Record<StatsCard['key'], string>> = {
  night: 'per night',
  'feed-trend': 'per feed, 7-day average by day',
  'feed-spacing': 'typical daytime gap by day',
};

function tipPosition(index: number, count: number) {
  const anchor = barAnchor(index, count);
  return {
    className: anchor.edge === 'center' ? '-translate-x-1/2' : '',
    style: { [anchor.edge === 'right' ? 'right' : 'left']: `${anchor.percent}%` },
  };
}

export function StatsCards({
  cards,
  plusBadges = false,
  columns = 2,
  linkBars = false,
}: {
  cards: StatsCard[];
  plusBadges?: boolean;
  columns?: 1 | 2;
  linkBars?: boolean;
}) {
  return (
    <div className={cn('grid gap-4', columns === 2 && 'lg:grid-cols-2')}>
      {cards.map((card) => (
        <StatsCardView key={card.key} card={card} plusBadge={plusBadges && Boolean(card.plus)} linkBars={linkBars} />
      ))}
    </div>
  );
}

function StatsCardView({ card, plusBadge, linkBars }: { card: StatsCard; plusBadge: boolean; linkBars: boolean }) {
  const look = LOOK[card.key];
  const { chart } = card;
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(chart.bars.length - 1);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const tabStop = Math.min(focusIndex, chart.bars.length - 1);
  const ends = chartEnds(chart);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = nextBarIndex(event.key, index, chart.bars.length);
    if (target === null) return;
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
        <h2 id={`stats-${card.key}`} className="flex-1 text-row-title font-semibold">
          {card.title}
        </h2>
        {plusBadge && <PlusBadge />}
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {card.figures.map((figure) => (
          <div key={figure.label} className="flex flex-col rounded-tile bg-surface px-3 py-2">
            <dt className="text-caption text-ink-2">{figure.label}</dt>
            <dd className="tabular text-label font-semibold">{figure.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex flex-col gap-1.5">
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
          aria-label={`${card.title} ${CHART_LABEL[card.key] ?? 'per day'}`}
        >
          {chart.bars.map((bar, index) => {
            const total = bar.values.reduce((sum, value) => sum + value, 0);
            const top = topSegment(bar.values);
            const link = linkBars ? statsBarLink(card.key, bar, chart.weekly) : null;
            const readout = barReadout(chart, bar);
            const props = {
              ref: (element: HTMLElement | null) => {
                bars.current[index] = element;
              },
              tabIndex: index === tabStop ? 0 : -1,
              className: cn(
                'flex h-full min-w-0 flex-1 flex-col-reverse rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active === index && 'opacity-80',
              ),
              onMouseEnter: () => setActive(index),
              onMouseLeave: () => setActive(null),
              onFocus: () => {
                setActive(index);
                setFocusIndex(index);
              },
              onBlur: () => setActive(null),
              onKeyDown: (event: KeyboardEvent) => onKeyDown(event, index),
            };
            const segments = (
              <>
                {bar.values.map((value, seriesIndex) => (
                  <div
                    key={seriesIndex}
                    className={cn(look.series[seriesIndex], seriesIndex === top && 'rounded-t-sm')}
                    style={{ height: chart.max ? `${(value / chart.max) * 100}%` : 0 }}
                  />
                ))}
                {total === 0 && <div className="h-px bg-line" />}
              </>
            );
            return link ? (
              <Link
                key={bar.label}
                {...props}
                to="/timeline"
                search={link}
                aria-label={`${readout}. Open in timeline`}
                className={cn(props.className, 'cursor-pointer hover:opacity-80')}
              >
                {segments}
              </Link>
            ) : (
              <div key={bar.label} {...props} role="img" aria-label={readout}>
                {segments}
              </div>
            );
          })}
          {active !== null && chart.bars[active] && (
            <ChartTip
              className={cn('bottom-full mb-2 max-w-full', tipPosition(active, chart.bars.length).className)}
              style={tipPosition(active, chart.bars.length).style}
            >
              {barReadout(chart, chart.bars[active])}
            </ChartTip>
          )}
        </div>
        {ends && (
          <div className="flex justify-between text-caption text-ink-3">
            <span>{ends[0]}</span>
            <span>{ends[1]}</span>
          </div>
        )}
        {card.note && <p className="text-caption text-ink-3">{card.note}</p>}
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
