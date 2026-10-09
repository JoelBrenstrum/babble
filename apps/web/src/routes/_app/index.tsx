import { babySettingsQuery, eventsSinceQuery, latestEventsQuery, runningEventsQuery } from '@babble/api';
import { dayKeyFor, dayWindow, feedDueText, feedRemindersQuiet, nextFeedDue, summariseDay } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { useUnits } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/')({ component: HomePage });

function HomePage() {
  const { babble, baby, family } = Route.useRouteContext();
  const now = useNow(30_000);
  const units = useUnits(babble.client, baby.id);
  const window = dayWindow(
    dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes),
    baby.timezone,
    baby.day_start_minutes,
  );
  const since = new Date(window.start.getTime() - 24 * 3_600_000).toISOString().slice(0, 13);
  const running = useQuery(runningEventsQuery(babble.client, baby.id));
  const latest = useQuery(latestEventsQuery(babble.client, baby.id));
  const recent = useQuery(eventsSinceQuery(babble.client, baby.id, `${since}:00:00Z`));
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const due =
    settings && !feedRemindersQuiet(settings, now, baby.timezone)
      ? nextFeedDue([...(latest.data ?? []), ...(running.data ?? [])], settings)
      : null;

  return (
    <HomeOverview
      baby={baby}
      now={now}
      units={units}
      running={running.data ?? []}
      latest={latest.data ?? []}
      feedDue={due ? feedDueText(due, now) : null}
      summary={recent.data ? summariseDay(recent.data, { start: window.start, end: now }) : null}
      renderRunning={(event) => (
        <RunningCard event={event} client={babble.client} timeZone={baby.timezone} members={family.members} compact />
      )}
    />
  );
}
