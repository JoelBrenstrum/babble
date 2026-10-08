import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import {
  isEventType,
  listDayGroups,
  listStrip,
  listTypesFor,
  stripKind,
  stripWindow,
  trackerFor,
  type TrackerKey,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { TrackerIcon } from '@/components/tracker-icon';
import { EventRow } from '@/features/events/event-row';
import { SummaryStrip } from '@/features/timeline/totals';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useUnits } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';
import { useReadyState } from '@/lib/use-onboarding';

type Filter = 'all' | 'breast' | 'bottle';

export default function TrackerList() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const ready = useReadyState();
  if (!type || !isEventType(type)) return <Redirect href="/" />;
  if (!ready) return null;
  return <TrackerListContent eventType={type} baby={ready.baby} family={ready.family} />;
}

function TrackerListContent({
  eventType,
  baby,
  family,
}: {
  eventType: TrackerKey;
} & Pick<NonNullable<ReturnType<typeof useReadyState>>, 'baby' | 'family'>) {
  const { client } = useBabble();
  const now = useNow(30_000);
  const units = useUnits(client, baby.id);
  const isFeed = eventType === 'breast_feed' || eventType === 'bottle';
  const [filter, setFilter] = useState<Filter>(
    eventType === 'bottle' ? 'bottle' : eventType === 'breast_feed' ? 'breast' : 'all',
  );
  const events = useQuery(eventListQuery(client, baby.id, listTypesFor(eventType, filter)));
  const tracker = trackerFor(eventType);
  const kind = stripKind(eventType, filter);
  const groups = listDayGroups(kind, events.data ?? [], {
    now,
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    units,
    birthDate: baby.birth_date,
  });
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const stripRange = stripWindow(now, baby.timezone, baby.day_start_minutes);
  const recent = useQuery(eventsBetweenQuery(client, baby.id, stripRange.from, stripRange.to));
  const strip =
    events.data?.length && recent.data && settings
      ? listStrip(kind, [...recent.data, ...events.data], {
          now,
          timeZone: baby.timezone,
          dayStartMinutes: baby.day_start_minutes,
          nightStartMinutes: settings.night_start_minutes,
          nightEndMinutes: settings.night_end_minutes,
          units,
          birthDate: baby.birth_date,
          sex: baby.sex,
        })
      : null;
  const plusColor = useTokenColor('--on-primary');
  const spinnerColor = useTokenColor('--primary');

  return (
    <Screen>
      <ScreenHeader
        title={isFeed ? 'Feeds' : tracker.pluralLabel}
        icon={<TrackerIcon tracker={tracker} />}
        right={
          <Link
            href={`/track/${eventType === 'breast_feed' && filter === 'bottle' ? 'bottle' : eventType}/new`}
            asChild
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${tracker.label.toLowerCase()}`}
              className="size-tap items-center justify-center rounded-full bg-primary"
            >
              <Plus size={20} color={plusColor} strokeWidth={2.75} />
            </Pressable>
          </Link>
        }
      />
      <View className="gap-5">
        {isFeed && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'breast', label: 'Breast' },
              { value: 'bottle', label: 'Bottle' },
            ]}
          />
        )}
        {strip && (
          <Pressable accessibilityRole="link" accessibilityHint="Opens stats" onPress={() => router.push('/stats')}>
            <SummaryStrip items={strip} />
          </Pressable>
        )}
        {events.isPending && <ActivityIndicator size="large" color={spinnerColor} className="py-16" />}
        {events.data?.length === 0 && (
          <EmptyState
            illustration={<TrackerIcon tracker={tracker} size="lg" />}
            title={`No ${tracker.pluralLabel.toLowerCase()} yet`}
            body="Entries you log will show up here, grouped by day."
            action={
              <Button onPress={() => router.push(`/track/${filter === 'bottle' ? 'bottle' : eventType}/new`)}>
                {`Log ${(filter === 'bottle' ? trackerFor('bottle') : tracker).label.toLowerCase()}`}
              </Button>
            }
          />
        )}
        {groups.map((group) => (
          <View key={group.dayKey} className="gap-2">
            <View className="flex-row items-baseline justify-between gap-2 px-1">
              <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
                <Text accessibilityRole="header" className="font-bold text-body text-ink">
                  {group.title}
                </Text>
                {group.subtitle && (
                  <Text numberOfLines={1} className="flex-1 font-sans text-meta text-ink-3">
                    {group.subtitle}
                  </Text>
                )}
              </View>
              <Text className="font-semibold text-meta text-ink-2">{group.totals}</Text>
            </View>
            <Card className="overflow-hidden">
              {group.items.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  members={family.members}
                  timeZone={baby.timezone}
                  units={units}
                  now={now}
                  showTitle={isFeed && filter === 'all'}
                  showNotes={!group.notesInSubtitle}
                  divider={index > 0}
                />
              ))}
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  );
}
