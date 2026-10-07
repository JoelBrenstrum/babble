import { eventQuery, runningEventsQuery } from '@babble/api';
import { formatDuration, formatTimeOfDay, segmentTotals } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { RunningCard } from '@/features/events/running-card';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useNow } from '@/lib/use-now';
import { useReadyState } from '@/lib/use-onboarding';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ready = useReadyState();
  if (!ready || !id) return null;
  return <SessionContent id={id} ready={ready} />;
}

function SessionContent({ id, ready }: { id: string; ready: NonNullable<ReturnType<typeof useReadyState>> }) {
  const { client } = useBabble();
  const { baby, family } = ready;
  const running = useQuery(runningEventsQuery(client, baby.id));
  const fallback = useQuery({ ...eventQuery(client, baby.id, id), enabled: running.isSuccess });
  const now = useNow(1000);
  const spinnerColor = useTokenColor('--primary');
  const event = running.data?.find((item) => item.id === id) ?? fallback.data;

  if (!event) return <ActivityIndicator size="large" color={spinnerColor} className="flex-1 bg-bg" />;
  if (event.deletedAt) return <Redirect href="/" />;
  if (event.endedAt !== null) return <Redirect href={`/events/${id}`} />;

  const segments = event.type === 'breast_feed' || event.type === 'pump' ? event.segments : [];
  const totals = segmentTotals(segments, now);
  const title = event.type === 'sleep' ? 'Sleep' : event.type === 'pump' ? 'Pump' : 'Breastfeed';

  return (
    <Screen>
      <ScreenHeader
        title={title}
        right={
          <Text className="font-sans text-meta text-ink-2">{`started ${formatTimeOfDay(event.startedAt, baby.timezone)}`}</Text>
        }
      />
      <View className="gap-6">
        <RunningCard
          event={event}
          client={client}
          timeZone={baby.timezone}
          members={family.members}
          onDiscarded={() => router.replace('/')}
        />
        {segments.length > 0 && (
          <View className="gap-2">
            <SectionLabel>Session</SectionLabel>
            <Card>
              {segments.map((segment, index) => (
                <View
                  key={segment.startedAt}
                  className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
                >
                  <View
                    className={`size-3 rounded-full ${segment.side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`}
                  />
                  <Text className="flex-1 font-semibold text-body text-ink">
                    {segment.side === 'left' ? 'Left' : 'Right'}
                  </Text>
                  {segment.endedAt === null && (
                    <Text className="font-semibold text-meta text-on-feed-right">running</Text>
                  )}
                  <Text className="font-sans text-body text-ink">
                    {formatDuration(
                      (segment.endedAt ? Date.parse(segment.endedAt) : now.getTime()) - Date.parse(segment.startedAt),
                    )}
                  </Text>
                </View>
              ))}
              <View className="flex-row justify-between border-t border-line px-4 py-3">
                <Text className="font-sans text-meta text-ink-2">{`Total ${event.type === 'pump' ? 'pumping' : 'feeding'}`}</Text>
                <Text className="font-semibold text-meta text-ink">{formatDuration(totals.activeMs)}</Text>
              </View>
            </Card>
          </View>
        )}
      </View>
    </Screen>
  );
}
