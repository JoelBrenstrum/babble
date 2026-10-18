import { eventQuery, latestEventsQuery, runningEventsQuery, toBabbleError, authorName } from '@babble/api';
import { useAsyncAction, useNow, useReopenSession, useTrackingSettings } from '@babble/api/react';
import {
  canResumeSession,
  entryAuthorText,
  entryEndedText,
  eventToDraft,
  importedNote,
  isSessionType,
  pumpFinishSummary,
  resumeCopy,
  trackerFor,
  tracksIdle,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatusMessage } from '@/components/status-message';
import { TrackerIcon } from '@/components/tracker-icon';
import { EventForm } from '@/features/events/event-form';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { NapBreakdown } from '@/features/events/nap-breakdown';
import { SessionBreakdown } from '@/features/events/session-breakdown';
import { Button } from '@/components/button';
import { useCanLog } from '@/lib/use-can-log';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function EditEvent() {
  const { id, finish } = useLocalSearchParams<{ id: string; finish?: string }>();
  const ready = useReadyState();
  if (!ready || !id) return null;
  return <EditEventContent id={id} finish={finish === '1'} baby={ready.baby} family={ready.family} />;
}

function EditEventContent({
  id,
  finish,
  baby,
  family,
}: {
  id: string;
  finish: boolean;
} & Pick<ReadyState, 'baby' | 'family'>) {
  const { client } = useBabble();
  const logging = useCanLog();
  const { units, mergeGapMs } = useTrackingSettings(client, baby.id);
  const latest = useQuery(latestEventsQuery(client, baby.id)).data ?? [];
  const running = useQuery(runningEventsQuery(client, baby.id)).data ?? [];
  const now = useNow(30_000);
  const resumeSession = useReopenSession(client, baby.id);
  const resume = useAsyncAction();
  const event = useQuery(eventQuery(client, baby.id, id));
  const spinnerColor = useTokenColor('--primary');

  if (event.isPending) return <ActivityIndicator size="large" color={spinnerColor} className="flex-1 bg-bg" />;
  if (event.error || !event.data || event.data.deletedAt) {
    return (
      <Screen>
        <ScreenHeader title="Entry" />
        <StatusMessage tone="danger">
          {event.error ? toBabbleError(event.error).message : 'This entry was deleted.'}
        </StatusMessage>
      </Screen>
    );
  }
  if (event.data.endedAt === null && isSessionType(event.data.type)) return <Redirect href={`/sessions/${id}`} />;

  const tracker = trackerFor(event.data.type);
  const note = importedNote(event.data);
  const finishSummary = finish ? pumpFinishSummary(event.data, baby.timezone) : null;
  const memberName = (userId: string | null) => authorName(family, userId);
  const resumable = logging && canResumeSession(event.data, latest, running, now) ? event.data : null;
  const ended = entryEndedText({
    endedBy: memberName(event.data.endedBy),
    endRecordedAt: event.data.endRecordedAt,
    startedAt: event.data.startedAt,
    timeZone: baby.timezone,
  });
  return (
    <Screen>
      <ScreenHeader
        title={finish ? 'How much did you pump?' : tracker.label}
        icon={<TrackerIcon tracker={tracker} />}
      />
      {finishSummary && <Text className="-mt-3 mb-4 font-sans text-meta text-ink-2">{finishSummary}</Text>}
      {(event.data.type === 'breast_feed' || event.data.type === 'pump') && event.data.segments.length > 0 && (
        <View className="mb-4">
          <SessionBreakdown
            segments={event.data.segments}
            mergeGapMs={tracksIdle(event.data.source) ? mergeGapMs : Number.POSITIVE_INFINITY}
            now={now}
            noun={event.data.type === 'pump' ? 'pumping' : 'feeding'}
          />
        </View>
      )}
      {event.data.type === 'sleep' && event.data.segments.length > 0 && (
        <View className="mb-4">
          <NapBreakdown nap={event.data} now={now} />
        </View>
      )}
      {resumable && (
        <View className="mb-4 gap-2">
          <Button
            size="lg"
            loading={resume.busy}
            onPress={async () => {
              if (await resume.run(() => resumeSession.mutateAsync({ type: resumable.type, eventId: id })))
                router.replace(`/sessions/${id}`);
            }}
          >
            {resumeCopy(resumable.type).action}
          </Button>
          <Text className="text-center font-sans text-meta text-ink-2">{resumeCopy(resumable.type).hint}</Text>
          {resume.error && <StatusMessage tone="danger">{resume.error}</StatusMessage>}
        </View>
      )}
      <View className="mb-3 gap-1">
        <Text className="font-sans text-meta text-ink-2">
          {entryAuthorText({
            author: memberName(event.data.createdBy),
            device: event.data.createdDevice,
            createdAt: event.data.createdAt,
            updatedAt: event.data.updatedAt,
            timeZone: baby.timezone,
            imported: event.data.source === 'huckleberry_csv',
            timer: event.data.endRecordedAt !== null,
          })}
        </Text>
        {ended && <Text className="font-sans text-meta text-ink-2">{ended}</Text>}
      </View>
      {note && <StatusMessage tone="info">{note}</StatusMessage>}
      <Card className="p-5">
        <EventForm
          key={event.data.updatedAt}
          client={client}
          babyId={baby.id}
          timeZone={baby.timezone}
          units={units}
          event={event.data}
          initial={eventToDraft(event.data)}
          focusAmounts={finish}
          readOnly={!logging}
          onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </Card>
    </Screen>
  );
}
