import {
  describeEvent,
  formatTimeOfDay,
  type BabyEvent,
  type PartIcon,
  type PartTone,
  type Units,
} from '@babble/domain';
import { Link } from '@tanstack/react-router';
import {
  Circle,
  CircleDashed,
  CircleDot,
  Droplet,
  Layers,
  Pause,
  Play,
  Ruler,
  Stethoscope,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import type { FamilyMemberRow } from '@babble/api';
import { Avatar } from '#/components/ui/avatar';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';

export const PART_STYLES: Record<PartTone, string> = {
  'feed-left': 'bg-feed-left-soft text-on-feed-left',
  'feed-right': 'bg-feed-right-soft text-on-feed-right',
  downtime: 'bg-session-downtime-soft text-on-session-downtime',
  sleep: 'bg-sleep-soft text-on-sleep',
  bottle: 'bg-bottle-soft text-on-bottle',
  solids: 'bg-solids-soft text-on-solids',
  nappy: 'bg-nappy-soft text-on-nappy',
  pump: 'bg-pump-soft text-on-pump',
  growth: 'bg-growth-soft text-on-growth',
  custom: 'bg-custom-soft text-on-custom',
  neutral: 'bg-surface text-ink-2',
  caution: 'bg-caution-soft text-on-caution',
  active: 'bg-session-active-soft text-on-session-active',
};

const PART_ICONS: Record<PartIcon, LucideIcon> = {
  play: Play,
  pause: Pause,
  droplet: Droplet,
  layers: Layers,
  'circle-dot': CircleDot,
  circle: Circle,
  stethoscope: Stethoscope,
  weight: Weight,
  ruler: Ruler,
  'circle-dashed': CircleDashed,
};

export function EventRow({
  event,
  timeZone,
  units,
  now,
  showTitle = false,
  showNotes = true,
  members = [],
}: {
  members?: FamilyMemberRow[];
  event: BabyEvent;
  timeZone: string;
  units: Units;
  now: Date;
  showTitle?: boolean;
  showNotes?: boolean;
}) {
  const description = describeEvent(event, now, units);
  const author = members.find((member) => member.user_id === event.createdBy)?.display_name;
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
        {description.parts.map((part) => {
          const Icon = part.icon ? PART_ICONS[part.icon] : null;
          return (
            <span
              key={part.text}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-chip px-2.5 py-0.5 text-label font-semibold',
                PART_STYLES[part.tone],
              )}
            >
              {Icon && <Icon aria-hidden className="size-3" strokeWidth={3} />}
              {part.pooColours && <PooSwatch colours={part.pooColours} className="size-3.5" />}
              {part.text}
            </span>
          );
        })}
        {showNotes && event.notes && <span className="w-full truncate text-meta text-ink-3">{event.notes}</span>}
      </span>
      {description.trailing && (
        <span className="tabular whitespace-nowrap text-meta text-ink-2">{description.trailing}</span>
      )}
      {event.source === 'huckleberry_csv' ? (
        <span className="shrink-0 rounded-chip bg-surface px-2 py-0.5 text-caption font-semibold text-ink-2">
          Imported
        </span>
      ) : (
        author && (
          <span title={`Logged by ${author}`} className="shrink-0">
            <Avatar name={author} className="size-7 text-caption" />
            <span className="sr-only">Logged by {author}</span>
          </span>
        )
      )}
    </Link>
  );
}
