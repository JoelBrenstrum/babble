import { babySettingsQuery, latestEventsQuery, runningEventsQuery, familyAuthors } from '@babble/api';
import { useEventsInRange, useUnits } from '@babble/api/react';
import { feedDueFor, feedDueText, homeWindow, predictionText, summariseDay } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { InstallCard } from '#/features/install-app';
import { useInstall } from '#/lib/install-prompt';
import { useNow } from '#/lib/use-now';
import { usePrediction } from '#/lib/use-prediction';

export const Route = createFileRoute('/_app/')({ component: HomePage });

function HomePage() {
  const { babble, baby, family, canLog } = Route.useRouteContext();
  const now = useNow(30_000);
  const units = useUnits(babble.client, baby.id);
  const { window: dayToNow, day, since } = homeWindow(now, baby);
  const running = useQuery(runningEventsQuery(babble.client, baby.id));
  const latest = useQuery(latestEventsQuery(babble.client, baby.id));
  const recent = useEventsInRange(babble.client, baby.id, {
    from: since,
    to: day.end.toISOString(),
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
  });
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const install = useInstall();
  const prediction = usePrediction(babble, baby, family, now);
  const due = feedDueFor(latest.data ?? [], running.data ?? [], settings, now, baby.timezone);

  return (
    <div className="flex flex-col gap-6">
      <HomeOverview
        baby={baby}
        now={now}
        units={units}
        running={running.data ?? []}
        latest={latest.data ?? []}
        feedDue={due ? feedDueText(due, now, baby.timezone) : null}
        prediction={predictionText(prediction, baby.timezone)}
        predictionPlus={babble.config.billingEnabled}
        summary={recent.data ? summariseDay(recent.data, dayToNow) : null}
        canLog={canLog}
        renderRunning={(event) => (
          <RunningCard
            event={event}
            client={babble.client}
            timeZone={baby.timezone}
            members={familyAuthors(family)}
            compact
            readOnly={!canLog}
          />
        )}
      />
      <InstallCard install={install} />
    </div>
  );
}
