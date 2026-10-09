import { babySettingsQuery, eventsSinceQuery, latestEventsQuery, runningEventsQuery } from '@babble/api';
import { dayKeyFor, dayWindow, feedDueText, feedRemindersQuiet, nextFeedDue, summariseDay } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/screen';
import { RunningCard } from '@/features/events/running-card';
import { HomeOverview } from '@/features/home-overview';
import { useBabble } from '@/lib/babble';
import { useUnits } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';
import { useActiveBaby } from '@/lib/active-baby';
import { useOnboarding, useReadyState } from '@/lib/use-onboarding';

export default function Home() {
  const ready = useReadyState();
  if (!ready) return null;
  return <HomeContent family={ready.family} baby={ready.baby} />;
}

function HomeContent({ family, baby }: Pick<NonNullable<ReturnType<typeof useReadyState>>, 'family' | 'baby'>) {
  const { client } = useBabble();
  const now = useNow(30_000);
  const units = useUnits(client, baby.id);
  const window = dayWindow(
    dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes),
    baby.timezone,
    baby.day_start_minutes,
  );
  const since = `${new Date(window.start.getTime() - 24 * 3_600_000).toISOString().slice(0, 13)}:00:00Z`;
  const running = useQuery(runningEventsQuery(client, baby.id));
  const latest = useQuery(latestEventsQuery(client, baby.id));
  const recent = useQuery(eventsSinceQuery(client, baby.id, since));
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const due =
    settings && !feedRemindersQuiet(settings, now, baby.timezone)
      ? nextFeedDue([...(latest.data ?? []), ...(running.data ?? [])], settings)
      : null;
  const { choices } = useOnboarding();
  const active = useActiveBaby();

  return (
    <Screen edges={['top']}>
      <HomeOverview
        family={family}
        baby={baby}
        now={now}
        units={units}
        running={running.data ?? []}
        latest={latest.data ?? []}
        feedDue={due ? feedDueText(due, now) : null}
        summary={recent.data ? summariseDay(recent.data, { start: window.start, end: now }) : null}
        choices={choices}
        onSelectBaby={(choice) => active.select({ familyId: choice.familyId, babyId: choice.baby.id })}
        renderRunning={(event) => (
          <RunningCard event={event} client={client} timeZone={baby.timezone} members={family.members} compact />
        )}
      />
    </Screen>
  );
}
