import {
  describeEvent,
  formatTimeOfDay,
  type BabyEvent,
  type DescriptionPart,
  type PartIcon,
  type PartTone,
  type Units,
} from '@babble/domain';
import { Link } from 'expo-router';
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
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { FamilyMemberRow } from '@babble/api';
import { Avatar } from '@/components/avatar';
import { PooSwatch } from '@/components/poo-swatch';
import { useTokenColor } from '@/lib/theme';

type TokenName = Parameters<typeof useTokenColor>[0];

const PART_STYLES: Record<PartTone, [string, string, TokenName]> = {
  'feed-left': ['bg-feed-left-soft', 'text-on-feed-left', '--on-feed-left'],
  'feed-right': ['bg-feed-right-soft', 'text-on-feed-right', '--on-feed-right'],
  downtime: ['bg-session-downtime-soft', 'text-on-session-downtime', '--on-session-downtime'],
  sleep: ['bg-sleep-soft', 'text-on-sleep', '--on-sleep'],
  bottle: ['bg-bottle-soft', 'text-on-bottle', '--on-bottle'],
  solids: ['bg-solids-soft', 'text-on-solids', '--on-solids'],
  nappy: ['bg-nappy-soft', 'text-on-nappy', '--on-nappy'],
  pump: ['bg-pump-soft', 'text-on-pump', '--on-pump'],
  growth: ['bg-growth-soft', 'text-on-growth', '--on-growth'],
  custom: ['bg-custom-soft', 'text-on-custom', '--on-custom'],
  neutral: ['bg-surface', 'text-ink-2', '--ink-2'],
  caution: ['bg-caution-soft', 'text-on-caution', '--on-caution'],
  active: ['bg-session-active-soft', 'text-on-session-active', '--on-session-active'],
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

function PartChip({ part }: { part: DescriptionPart }) {
  const [bg, fg, token] = PART_STYLES[part.tone];
  const color = useTokenColor(token);
  const Icon = part.icon ? PART_ICONS[part.icon] : null;
  return (
    <View className={`flex-row items-center gap-1.5 rounded-chip px-2.5 py-0.5 ${bg}`}>
      {Icon && <Icon size={12} color={color} strokeWidth={3} />}
      {part.pooColours && <PooSwatch colours={part.pooColours} size={14} />}
      <Text className={`font-semibold text-label ${fg}`}>{part.text}</Text>
    </View>
  );
}

export function EventRow({
  event,
  timeZone,
  units,
  now,
  showTitle = false,
  showNotes = true,
  divider = false,
  members = [],
}: {
  members?: FamilyMemberRow[];
  event: BabyEvent;
  timeZone: string;
  units: Units;
  now: Date;
  showTitle?: boolean;
  showNotes?: boolean;
  divider?: boolean;
}) {
  const description = describeEvent(event, now, units);
  const author = members.find((member) => member.user_id === event.createdBy)?.display_name;
  const href =
    description.running && event.type !== 'bottle'
      ? (`/sessions/${event.id}` as const)
      : (`/events/${event.id}` as const);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={`${description.title} at ${formatTimeOfDay(event.startedAt, timeZone)}${author ? `, logged by ${author}` : ''}`}
        className={`min-h-tap flex-row items-center gap-3 px-4 py-3 active:bg-surface ${divider ? 'border-t border-line' : ''}`}
      >
        <Text className="w-16 font-semibold text-meta text-ink-2">{formatTimeOfDay(event.startedAt, timeZone)}</Text>
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          {(showTitle || description.parts.length === 0) && (
            <Text className="font-semibold text-body text-ink">{description.title}</Text>
          )}
          {description.parts.map((part) => (
            <PartChip key={part.text} part={part} />
          ))}
          {showNotes && event.notes && (
            <Text numberOfLines={1} className="w-full font-sans text-meta text-ink-3">
              {event.notes}
            </Text>
          )}
        </View>
        {description.trailing && <Text className="font-sans text-meta text-ink-2">{description.trailing}</Text>}
        {event.source === 'huckleberry_csv' ? (
          <View className="rounded-chip bg-surface px-2 py-0.5">
            <Text className="font-semibold text-caption text-ink-2">Imported</Text>
          </View>
        ) : (
          author && <Avatar name={author} />
        )}
      </Pressable>
    </Link>
  );
}
