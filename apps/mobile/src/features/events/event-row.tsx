import { describeEvent, formatTimeOfDay, type BabyEvent, type PartTone, type Units } from '@babble/domain';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { FamilyMemberRow } from '@babble/api';
import { Avatar } from '@/components/avatar';
import { PooSwatch } from '@/components/poo-swatch';

const PART_STYLES: Record<PartTone, [string, string]> = {
  'feed-left': ['bg-feed-left-soft', 'text-on-feed-left'],
  'feed-right': ['bg-feed-right-soft', 'text-on-feed-right'],
  downtime: ['bg-session-downtime-soft', 'text-on-session-downtime'],
  sleep: ['bg-sleep-soft', 'text-on-sleep'],
  bottle: ['bg-bottle-soft', 'text-on-bottle'],
  nappy: ['bg-nappy-soft', 'text-on-nappy'],
  pump: ['bg-pump-soft', 'text-on-pump'],
  growth: ['bg-growth-soft', 'text-on-growth'],
  custom: ['bg-custom-soft', 'text-on-custom'],
};

export function EventRow({
  event,
  timeZone,
  units,
  now,
  showTitle = false,
  divider = false,
  members = [],
}: {
  members?: FamilyMemberRow[];
  event: BabyEvent;
  timeZone: string;
  units: Units;
  now: Date;
  showTitle?: boolean;
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
          {description.parts.map((part) => {
            const [bg, fg] = PART_STYLES[part.tone];
            return (
              <View key={part.text} className={`flex-row items-center gap-1.5 rounded-chip px-2.5 py-0.5 ${bg}`}>
                {part.pooColours && <PooSwatch colours={part.pooColours} size={14} />}
                <Text className={`font-semibold text-label ${fg}`}>
                  {part.tone === 'downtime' ? `⏸ ${part.text}` : part.text}
                </Text>
              </View>
            );
          })}
        </View>
        {description.running ? (
          <Text className="font-bold text-meta text-primary">Running</Text>
        ) : (
          description.duration && <Text className="font-sans text-meta text-ink-2">{description.duration}</Text>
        )}
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
