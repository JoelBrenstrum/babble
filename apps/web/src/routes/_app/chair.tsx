import {
  babyChoices,
  signOut,
  babySettingsQuery,
  clock,
  latestEventsQuery,
  runningEventsQuery,
  familyAuthors,
} from '@babble/api';
import {
  useNow,
  useRemoveEntry,
  useReopenSession,
  useRestoreEntry,
  useSaveEvent,
  useSessionAction,
  useStartSession,
  useTrackingSettings,
  useUnits,
} from '@babble/api/react';
import {
  buildChairData,
  canResumeSession,
  CHAIR_IDLE_DIM_MS,
  chairBottleDraft,
  chairNappyDraft,
  latestFeed,
  memberTones,
  promptsForSessionEvent,
  screenOffMinutes,
  tapWakesScreen,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { familyHasFeature } from '@babble/config';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MemberTonesProvider } from '#/components/ui/avatar';
import { ChairScreen, type ChairActions, type ChairData } from '#/features/chair/chair-screen';
import { useNapPrompt } from '#/features/nap-prompt';
import { ChairPreview } from '#/features/landing/previews';
import { PlusTeaser } from '#/features/plus-teaser';
import { useSelectBaby } from '#/lib/use-select-baby';
import { useOnline } from '#/lib/use-online';
import { useFullscreen } from '#/lib/fullscreen';
import { reloadForRelease, useNewRelease } from '#/lib/release';
import { useScreenWakeLock } from '#/lib/wake-lock';
import { parseBooleanParam } from '#/lib/search-params';

export const Route = createFileRoute('/_app/chair')({
  validateSearch: (search: Record<string, unknown>): { screenOff?: number; kiosk?: boolean } => ({
    screenOff: screenOffMinutes(search.screenOff),
    kiosk: parseBooleanParam(search.kiosk),
  }),
  beforeLoad: ({ context }) => {
    if (!context.canLog) throw redirect({ to: '/' });
  },
  component: ChairPage,
});

function ChairPage() {
  const { babble, family } = Route.useRouteContext();
  if (!familyHasFeature(babble.config.billingEnabled, family.plan, 'chair_mode')) return <ChairLocked />;
  return <ChairLive />;
}

function ChairLocked() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link
        to="/settings"
        className="flex items-center gap-2 self-start text-body font-semibold text-ink-2 hover:text-ink"
      >
        <ChevronLeft className="size-5" strokeWidth={2.75} />
        Back to Settings
      </Link>
      <PlusTeaser feature="chair_mode" title="Chair mode">
        Chair mode turns a tablet or touchscreen by the feeding chair into a feed station with giant buttons. It's part
        of Babble Plus. Here's what it looks like.
      </PlusTeaser>
      <ChairPreview />
    </div>
  );
}

function ChairLive() {
  const { babble, baby, family, families } = Route.useRouteContext();
  const client = babble.client;
  const now = useNow(1000);
  const online = useOnline();
  const units = useUnits(client, baby.id);
  const { mergeGapMs, nappyPrompt } = useTrackingSettings(client, baby.id);
  const running = useQuery(runningEventsQuery(client, baby.id)).data ?? [];
  const latest = useQuery(latestEventsQuery(client, baby.id)).data ?? [];
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const start = useStartSession(client, baby.id);
  const session = useSessionAction(client, baby.id);
  const save = useSaveEvent(client, baby.id);
  const remove = useRemoveEntry(client, baby.id);
  const resume = useReopenSession(client, baby.id);
  const restore = useRestoreEntry(client, baby.id);
  const showNapPrompt = useNapPrompt();
  const updateReady = useNewRelease();
  const fullscreen = useFullscreen();
  const [lastTouchAt, setLastTouchAt] = useState(() => clock.now().getTime());
  const tones = useMemo(() => memberTones(family.members), [family.members]);
  const selectBaby = useSelectBaby();
  const choices = babyChoices(families);
  const { screenOff, kiosk } = Route.useSearch();

  const {
    data: view,
    feed,
    nap,
  } = buildChairData({
    baby,
    choices,
    members: familyAuthors(family),
    running,
    latest,
    settings,
    units,
    mergeGapMs,
    nappyPrompt,
    now,
    lastTouchAt,
  });
  const data: ChairData = {
    ...view,
    updateReady,
    fullscreen: { supported: fullscreen.supported && !kiosk, active: fullscreen.active },
    offline: !online,
  };

  useScreenWakeLock(feed !== null);

  const actions: ChairActions = {
    startFeed: async (side) => {
      const last = latestFeed(latest);
      if (last && canResumeSession(last, latest, running, clock.now())) {
        await resume.mutateAsync({ type: 'breast_feed', eventId: last.id, side });
        return 'resumed';
      }
      const at = clock.now().toISOString();
      await start.mutateAsync({ type: 'breast_feed', side });
      for (const prompt of promptsForSessionEvent({
        kind: 'start',
        event: { type: 'breast_feed' },
        running,
        latest,
        nappyTiming: nappyPrompt,
        at,
      })) {
        if (prompt.kind !== 'nappy') showNapPrompt(prompt);
      }
      return 'started';
    },
    switchSide: (side) => feed && session.mutate({ event: feed, action: { kind: 'switch', side } }),
    pause: () => feed && session.mutate({ event: feed, action: { kind: 'pause' } }),
    resume: (side) => feed && session.mutate({ event: feed, action: { kind: 'resume', side } }),
    endFeed: async () => {
      if (feed) await session.mutateAsync({ event: feed, action: { kind: 'end' } });
    },
    resumeFeed: (feedId) => resume.mutateAsync({ type: 'breast_feed', eventId: feedId }),
    saveBottle: (amount, content) => save.mutateAsync({ draft: chairBottleDraft(amount, content, units, clock.now()) }),
    saveNappy: (type) => save.mutateAsync({ draft: chairNappyDraft(type, clock.now()) }),
    startNap: (at) => start.mutateAsync({ type: 'sleep', startAt: at }),
    endNap: async () => {
      if (nap) await session.mutateAsync({ event: nap, action: { kind: 'end' } });
    },
    pauseNap: () => nap && session.mutate({ event: nap, action: { kind: 'pause' } }),
    resumeNap: () => nap && session.mutate({ event: nap, action: { kind: 'resume' } }),
    undoEntry: (eventId) => remove.mutateAsync(eventId),
    restoreEntry: (eventId) => restore.mutateAsync(eventId),
    wake: () => {
      const touchedAt = clock.now().getTime();
      setLastTouchAt(touchedAt);
      return { screenWasOff: tapWakesScreen(screenOff, touchedAt, lastTouchAt) };
    },
    refresh: reloadForRelease,
    signOut: async () => {
      await signOut(client);
      window.location.assign('/chair' + window.location.search);
    },
    enterFullscreen: fullscreen.enter,
    exitFullscreen: fullscreen.exit,
    dimNow: () => setLastTouchAt(clock.now().getTime() - CHAIR_IDLE_DIM_MS),
    selectBaby: (babyId) => {
      const choice = choices.find((candidate) => candidate.baby.id === babyId);
      if (choice) selectBaby(choice);
    },
  };

  const refreshWhenIdle = updateReady && data.dimmed && !feed;
  useEffect(() => {
    if (refreshWhenIdle) reloadForRelease();
  }, [refreshWhenIdle]);

  return (
    <MemberTonesProvider value={tones}>
      <ChairScreen data={data} actions={actions} />
    </MemberTonesProvider>
  );
}
