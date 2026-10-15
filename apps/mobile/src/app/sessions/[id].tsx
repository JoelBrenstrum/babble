import { useSessionAction, useTrackingSettings } from '@babble/api/react';
import { clock, eventListQuery, eventQuery, runningEventsQuery, familyAuthors } from '@babble/api';
import { formatTimeOfDay, liveMergeOffer, READ_ONLY_NOTE, trimIdleSwitch } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatusMessage } from '@/components/status-message';
import { ReadOnlyRunning } from '@/features/events/read-only-running';
import { RunningCard } from '@/features/events/running-card';
import { KeepAwakeToggle } from '@/features/keep-awake-toggle';
import { LiveMergeOffer } from '@/features/events/merge-feeds';
import { NapBreakdown } from '@/features/events/nap-breakdown';
import { SessionBreakdown } from '@/features/events/session-breakdown';
import { SleepDetailsEditor } from '@/features/events/sleep-details-editor';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useCanLog } from '@/lib/use-can-log';
import { useNow } from '@/lib/use-now';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ready = useReadyState();
  if (!ready || !id) return null;
  return <SessionContent id={id} ready={ready} />;
}

function SessionContent({ id, ready }: { id: string; ready: ReadyState }) {
  const { client } = useBabble();
  const logging = useCanLog();
  const { baby, family } = ready;
  const running = useQuery(runningEventsQuery(client, baby.id));
  const fallback = useQuery({ ...eventQuery(client, baby.id, id), enabled: running.isSuccess });
  const now = useNow(1000);
  const { mergeGapMs, units } = useTrackingSettings(client, baby.id);
  const action = useSessionAction(client, baby.id);
  const spinnerColor = useTokenColor('--primary');
  const event = running.data?.find((item) => item.id === id) ?? fallback.data;
  const feeds = useQuery({
    ...eventListQuery(client, baby.id, ['breast_feed']),
    enabled: logging && event?.type === 'breast_feed',
  });

  if (!event) return <ActivityIndicator size="large" color={spinnerColor} className="flex-1 bg-bg" />;
  if (event.deletedAt) return <Redirect href="/" />;
  if (event.endedAt !== null) return <Redirect href={`/events/${id}`} />;

  const segments = event.type === 'breast_feed' || event.type === 'pump' ? event.segments : [];
  const trimTo = logging ? trimIdleSwitch(event, clock.now()) : null;
  const merge = logging && feeds.data ? liveMergeOffer(event, feeds.data) : null;
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
        {logging ? (
          <RunningCard
            event={event}
            client={client}
            timeZone={baby.timezone}
            members={familyAuthors(family)}
            onDiscarded={() => router.replace('/')}
          />
        ) : (
          <>
            <StatusMessage tone="info">{READ_ONLY_NOTE}</StatusMessage>
            <ReadOnlyRunning event={event} now={now} units={units} timeZone={baby.timezone} />
          </>
        )}
        {merge && (
          <LiveMergeOffer
            key={merge.earlierId}
            client={client}
            babyId={baby.id}
            merge={merge}
            onMerged={() => router.replace(`/sessions/${merge.earlierId}`)}
          />
        )}
        {logging && event.type !== 'sleep' && <KeepAwakeToggle />}
        {logging && event.type === 'sleep' && (
          <View className="gap-2">
            <SectionLabel>Details</SectionLabel>
            <Card className="gap-3 p-5">
              <Text className="font-sans text-meta text-ink-2">Saved as you go, without stopping the timer.</Text>
              <SleepDetailsEditor event={event} client={client} babyId={baby.id} />
            </Card>
          </View>
        )}
        {event.type === 'sleep' && event.segments.length > 0 && (
          <View className="gap-2">
            <SectionLabel>Session</SectionLabel>
            <NapBreakdown
              nap={event}
              now={now}
              onTrimAwake={
                trimTo ? () => action.mutate({ event, action: { kind: 'set-switch', at: trimTo } }) : undefined
              }
            />
          </View>
        )}
        {segments.length > 0 && (
          <View className="gap-2">
            <SectionLabel>Session</SectionLabel>
            <SessionBreakdown
              segments={segments}
              mergeGapMs={mergeGapMs}
              now={now}
              paused={!segments.some((segment) => segment.endedAt === null)}
              noun={event.type === 'pump' ? 'pumping' : 'feeding'}
              onTrimIdle={
                trimTo ? () => action.mutate({ event, action: { kind: 'set-switch', at: trimTo } }) : undefined
              }
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
