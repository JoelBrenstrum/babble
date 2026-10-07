import { eventQuery } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EventForm, toDraft } from '#/features/events/event-form';
import { isSessionType, trackerFor } from '#/lib/trackers';
import { useUnits } from '#/lib/use-events';
import { toBabbleError } from '@babble/api';

export const Route = createFileRoute('/_app/events/$eventId')({
  validateSearch: (search: Record<string, unknown>): { finish?: boolean } => ({
    finish: search.finish === true || search.finish === 'true' ? true : undefined,
  }),
  component: EditEvent,
});

function EditEvent() {
  const { babble, baby } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const { finish } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const units = useUnits(babble.client, baby.id);
  const event = useQuery(eventQuery(babble.client, baby.id, eventId));

  if (event.isPending) {
    return (
      <div className="flex justify-center py-16 text-primary">
        <Spinner className="size-7" />
      </div>
    );
  }
  if (event.error || !event.data || event.data.deletedAt) {
    return (
      <StatusMessage tone="danger">
        {event.error ? toBabbleError(event.error).message : 'This entry was deleted.'}
      </StatusMessage>
    );
  }
  if (event.data.endedAt === null && isSessionType(event.data.type)) {
    return <Navigate to="/sessions/$eventId" params={{ eventId }} replace />;
  }

  const tracker = trackerFor(event.data.type);
  const done = () => {
    if (router.history.length > 1) router.history.back();
    else void navigate({ to: '/track/$type', params: { type: tracker.key } });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/track/$type"
          params={{ type: tracker.key }}
          aria-label="Back"
          className="grid size-tap place-items-center rounded-full hover:bg-surface"
        >
          <ChevronLeft className="size-6" strokeWidth={2.75} />
        </Link>
        <TrackerIcon tracker={tracker} />
        <h1 className="text-title font-bold">{finish ? 'How much did you pump?' : tracker.label}</h1>
      </div>
      {event.data.source === 'huckleberry_csv' && (
        <StatusMessage tone="info">Imported from Huckleberry. Side order and downtime aren't known.</StatusMessage>
      )}
      <Card className="p-5">
        <EventForm
          key={event.data.updatedAt}
          client={babble.client}
          babyId={baby.id}
          timeZone={baby.timezone}
          units={units}
          event={event.data}
          initial={toDraft(event.data)}
          focusAmounts={finish}
          onDone={done}
        />
      </Card>
    </div>
  );
}
