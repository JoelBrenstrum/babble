import { eventQuery, toBabbleError } from '@babble/api';
import { entryAuthorText, isSessionType, trackerFor } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatusMessage } from '@/components/status-message';
import { TrackerIcon } from '@/components/tracker-icon';
import { EventForm, toDraft } from '@/features/events/event-form';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useUnits } from '@/lib/use-events';
import { useReadyState } from '@/lib/use-onboarding';

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
} & Pick<NonNullable<ReturnType<typeof useReadyState>>, 'baby' | 'family'>) {
  const { client } = useBabble();
  const units = useUnits(client, baby.id);
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
  return (
    <Screen>
      <ScreenHeader
        title={finish ? 'How much did you pump?' : tracker.label}
        icon={<TrackerIcon tracker={tracker} />}
      />
      <Text className="mb-3 font-sans text-meta text-ink-2">
        {entryAuthorText({
          author: family.members.find((member) => member.user_id === event.data.createdBy)?.display_name,
          createdAt: event.data.createdAt,
          updatedAt: event.data.updatedAt,
          timeZone: baby.timezone,
          imported: event.data.source === 'huckleberry_csv',
        })}
      </Text>
      {event.data.source === 'huckleberry_csv' && (
        <StatusMessage tone="info">Imported from Huckleberry. Side order and downtime aren't known.</StatusMessage>
      )}
      <Card className="p-5">
        <EventForm
          key={event.data.updatedAt}
          client={client}
          babyId={baby.id}
          timeZone={baby.timezone}
          units={units}
          event={event.data}
          initial={toDraft(event.data)}
          focusAmounts={finish}
          onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </Card>
    </Screen>
  );
}
