import { describeEvent, formatTimeOfDay, type BabyEvent, type PartTone, type Units } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { Pause } from 'lucide-react';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';

export const PART_STYLES: Record<PartTone, string> = {
  'feed-left': 'bg-feed-left-soft text-on-feed-left',
  'feed-right': 'bg-feed-right-soft text-on-feed-right',
  downtime: 'bg-session-downtime-soft text-on-session-downtime',
  sleep: 'bg-sleep-soft text-on-sleep',
  bottle: 'bg-bottle-soft text-on-bottle',
  nappy: 'bg-nappy-soft text-on-nappy',
  pump: 'bg-pump-soft text-on-pump',
  growth: 'bg-growth-soft text-on-growth',
  custom: 'bg-custom-soft text-on-custom',
};

export function EventRow({
  event,
  timeZone,
  units,
  now,
  showTitle = false,
}: {
  event: BabyEvent;
  timeZone: string;
  units: Units;
  now: Date;
  showTitle?: boolean;
}) {
  const description = describeEvent(event, now, units);
  const href = description.running && event.type !== 'bottle' ? '/sessions/$eventId' : '/events/$eventId';
  return (
    <Link
      to={href}
      params={{ eventId: event.id }}
      className="flex min-h-tap items-center gap-3 px-4 py-3 hover:bg-surface focus-visible:bg-surface"
    >
      <span className="tabular w-16 shrink-0 text-meta font-semibold text-ink-2">
        {formatTimeOfDay(event.startedAt, timeZone)}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {showTitle || description.parts.length === 0 ? (
          <span className="text-body font-semibold">{description.title}</span>
        ) : (
          <span className="sr-only">{description.title}</span>
        )}
        {description.parts.map((part) => (
          <span
            key={part.text}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-chip px-2.5 py-0.5 text-label font-semibold',
              PART_STYLES[part.tone],
            )}
          >
            {part.tone === 'downtime' && <Pause className="size-3" strokeWidth={3} />}
            {part.pooColours && <PooSwatch colours={part.pooColours} className="size-3.5" />}
            {part.text}
          </span>
        ))}
        {event.notes && <span className="w-full truncate text-meta text-ink-3">{event.notes}</span>}
      </span>
      {description.running ? (
        <span className="text-meta font-bold text-primary">Running</span>
      ) : (
        description.duration && <span className="tabular text-meta text-ink-2">{description.duration}</span>
      )}
    </Link>
  );
}
