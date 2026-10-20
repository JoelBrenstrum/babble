import {
  babySettingsQuery,
  eventsSinceQuery,
  isAdmin,
  latestEventsQuery,
  runningEventsQuery,
  familyAuthors,
} from '@babble/api';
import { feedDueFor, feedDueText, homeWindow, predictionText, summariseDay } from '@babble/domain';
import { canAddBaby } from '@babble/config';
import { useNow, usePrediction, useUnits } from '@babble/api/react';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/screen';
import { ReadOnlyRunning } from '@/features/events/read-only-running';
import { RunningCard } from '@/features/events/running-card';
import { HomeOverview } from '@/features/home-overview';
import { useBabble } from '@/lib/babble';
import { useActiveBaby } from '@/lib/active-baby';
import { useCanLog } from '@/lib/use-can-log';
import { useOnboarding, useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function Home() {
  const ready = useReadyState();
  if (!ready) return null;
  return <HomeContent family={ready.family} baby={ready.baby} />;
}

function HomeContent({ family, baby }: Pick<ReadyState, 'family' | 'baby'>) {
  const { client, config, session } = useBabble();
  const logging = useCanLog();
  const now = useNow(30_000);
  const units = useUnits(client, baby.id);
  const { window, since } = homeWindow(now, baby);
  const running = useQuery(runningEventsQuery(client, baby.id));
  const latest = useQuery(latestEventsQuery(client, baby.id));
  const recent = useQuery(eventsSinceQuery(client, baby.id, since));
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const due = feedDueFor(latest.data ?? [], running.data ?? [], settings, now, baby.timezone);
  const prediction = usePrediction(client, config.billingEnabled, baby, family, now);
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
        feedDue={due ? feedDueText(due, now, baby.timezone) : null}
        prediction={predictionText(prediction, now, baby.timezone)}
        predictionPlus={config.billingEnabled}
        addBabyLocked={!canAddBaby(config.billingEnabled, family.plan, family.babies.length)}
        canAddBaby={session ? isAdmin(family, session.user.id) : false}
        canLog={logging}
        summary={recent.data ? summariseDay(recent.data, window) : null}
        choices={choices}
        onSelectBaby={(choice) => active.select({ familyId: choice.familyId, babyId: choice.baby.id })}
        renderRunning={(event) =>
          logging ? (
            <RunningCard
              event={event}
              client={client}
              timeZone={baby.timezone}
              members={familyAuthors(family)}
              compact
            />
          ) : (
            <ReadOnlyRunning event={event} now={now} units={units} timeZone={baby.timezone} />
          )
        }
      />
    </Screen>
  );
}
