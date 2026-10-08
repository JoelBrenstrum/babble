import {
  formatDuration,
  formatTimeOfDay,
  formatVolume,
  markerShiftPercent,
  nappyKind,
  type DayLayout,
  type TimelineItem,
  type Units,
  summariseSleep,
} from '@babble/domain';
import { Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';
import { TimelineItemLink } from './timeline-item-link';

const pct = (frac: number) => `${(frac * 100).toFixed(3)}%`;
const LABEL_MIN_FRAC = 0.03;

function markerPosition(item: TimelineItem) {
  const shift = `min(${item.column * 3.75}rem, ${markerShiftPercent(item.column)}%)`;
  return { top: pct(item.startFrac), left: shift, maxWidth: `calc(100% - ${shift})` };
}

function itemLabel(item: TimelineItem, timeZone: string, units: Units): string {
  const { event } = item;
  const at = formatTimeOfDay(event.startedAt, timeZone);
  const length = event.endedAt
    ? formatDuration(Date.parse(event.endedAt) - Date.parse(event.startedAt), { seconds: false })
    : 'running';
  switch (event.type) {
    case 'sleep':
      return `Sleep ${at}, ${length}`;
    case 'breast_feed':
      return `Breastfeed ${at}, ${length}`;
    case 'pump':
      return `Pump ${at}, ${length}`;
    case 'bottle':
      return `Bottle ${at}${event.details.amountMl ? `, ${formatVolume(event.details.amountMl, units)}` : ''}`;
    case 'nappy':
      return `Nappy ${at}, ${nappyKind(event.details).toLowerCase()}`;
    default:
      return at;
  }
}

export function DayTimeline({
  layout,
  ticks,
  timeZone,
  units,
  nowFrac,
}: {
  layout: DayLayout;
  ticks: { frac: number; label: string }[];
  timeZone: string;
  units: Units;
  nowFrac: number | null;
}) {
  const lanes: { key: keyof DayLayout; label: string; icon: LucideIcon; tone: string }[] = [
    { key: 'sleep', label: 'Sleep', icon: Moon, tone: 'text-sleep' },
    { key: 'feeds', label: 'Feeds', icon: Heart, tone: 'text-feed-left' },
    { key: 'nappies', label: 'Nappy', icon: Droplets, tone: 'text-nappy' },
    ...(layout.pumps.length ? [{ key: 'pumps' as const, label: 'Pump', icon: GlassWater, tone: 'text-pump' }] : []),
  ];
  const columns = { gridTemplateColumns: `2.25rem repeat(${lanes.length}, minmax(0, 1fr))` };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 text-meta font-semibold text-ink-2" style={columns}>
        <span />
        {lanes.map((lane) => (
          <span key={lane.key} className="flex items-center gap-1.5">
            <lane.icon className={cn('size-3.5', lane.tone)} strokeWidth={2.75} />
            {lane.label}
          </span>
        ))}
      </div>
      <div className="relative grid h-[36rem] gap-2 md:h-[46rem]" style={columns} data-testid="day-timeline">
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
        <div className="pointer-events-none absolute inset-y-0 left-[2.75rem] right-0">
          {ticks.map((tick, index) => (
            <div key={index} className="absolute inset-x-0 border-t border-line" style={{ top: pct(tick.frac) }} />
          ))}
          {nowFrac !== null && (
            <div className="absolute inset-x-0 z-10 border-t-2 border-primary" style={{ top: pct(nowFrac) }}>
              <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
        {lanes.map((lane) => (
          <div key={lane.key} className="relative overflow-x-clip">
            {layout[lane.key].map((item) => (
              <Item key={item.event.id} item={item} label={itemLabel(item, timeZone, units)} units={units} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Item({ item, label, units }: { item: TimelineItem; label: string; units: Units }) {
  const { event } = item;
  const span = { top: pct(item.startFrac), height: pct(item.endFrac - item.startFrac) };
  const roundEnds = cn(
    item.continuesBefore ? 'rounded-t-none' : 'rounded-t-md',
    item.continuesAfter ? 'rounded-b-none' : 'rounded-b-md',
  );

  if (event.type === 'sleep') {
    return (
      <TimelineItemLink
        event={event}
        running={item.running}
        label={label}
        style={span}
        className={cn(
          'absolute inset-x-0 min-h-1 overflow-hidden px-1.5 py-0.5 text-caption font-bold text-ink-on-solid hover:brightness-110',
          item.parts.length > 0 ? 'border border-dashed border-sleep' : 'bg-sleep',
          roundEnds,
          item.running && 'animate-pulse',
        )}
      >
        {item.parts.map((part, index) => (
          <span
            key={index}
            className="absolute inset-x-0 min-h-[2px] bg-sleep"
            style={{
              top: pct((part.startFrac - item.startFrac) / Math.max(item.endFrac - item.startFrac, 1e-6)),
              height: pct((part.endFrac - part.startFrac) / Math.max(item.endFrac - item.startFrac, 1e-6)),
            }}
          />
        ))}
        {item.endFrac - item.startFrac > LABEL_MIN_FRAC && (
          <span className="relative">
            {formatDuration(summariseSleep(event, new Date()).asleepMs, { seconds: false })}
          </span>
        )}
      </TimelineItemLink>
    );
  }

  if (event.type === 'breast_feed' || event.type === 'pump') {
    return (
      <TimelineItemLink
        event={event}
        running={item.running}
        label={label}
        style={span}
        className={cn(
          'absolute inset-x-0 min-h-1 overflow-hidden hover:brightness-110',
          event.type === 'pump' ? 'bg-pump/40' : 'border border-dashed border-session-downtime',
          roundEnds,
          item.running && 'animate-pulse',
        )}
      >
        {item.parts.map((part, index) => (
          <span
            key={index}
            className={cn(
              'absolute inset-x-0 min-h-[3px]',
              event.type === 'pump' ? 'bg-pump' : part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right',
            )}
            style={{
              top: pct((part.startFrac - item.startFrac) / Math.max(item.endFrac - item.startFrac, 1e-6)),
              height: pct((part.endFrac - part.startFrac) / Math.max(item.endFrac - item.startFrac, 1e-6)),
            }}
          />
        ))}
      </TimelineItemLink>
    );
  }

  const marker =
    'absolute flex h-5 -translate-y-1/2 items-center gap-1 truncate rounded-chip border px-1.5 text-caption font-bold hover:brightness-95';
  if (event.type === 'bottle') {
    return (
      <TimelineItemLink
        event={event}
        running={false}
        label={label}
        style={markerPosition(item)}
        className={cn(marker, 'z-[1] border-bottle/50 bg-bottle-soft text-on-bottle')}
      >
        {event.details.amountMl ? formatVolume(event.details.amountMl, units) : 'Bottle'}
      </TimelineItemLink>
    );
  }
  if (event.type === 'nappy') {
    return (
      <TimelineItemLink
        event={event}
        running={false}
        label={label}
        style={markerPosition(item)}
        className={cn(marker, 'border-nappy/50 bg-nappy-soft text-on-nappy')}
      >
        {event.details.dirty && event.details.pooColours.length > 0 && (
          <PooSwatch colours={event.details.pooColours} className="size-2 shrink-0" />
        )}
        {nappyKind(event.details)}
      </TimelineItemLink>
    );
  }
  return null;
}
