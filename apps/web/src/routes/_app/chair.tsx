import { babySettingsQuery, clock, latestEventsQuery, runningEventsQuery } from '@babble/api';
import {
  babyAgeLabel,
  chairBottleDraft,
  chairDimmed,
  chairIsNight,
  chairFeedSummary,
  chairFeedView,
  chairNappyDraft,
  defaultBottleAmount,
  defaultBottleContent,
  feedDueText,
  feedRemindersQuiet,
  formatDuration,
  formatTimeOfDay,
  lastFeedLine,
  lastNappyLine,
  memberTones,
  napPromptOnFeedStart,
  nappyPromptOnFeedStart,
  nextBreastSide,
  nextFeedDue,
  runningBreastFeed,
  summariseSleep,
  todayInTimeZone,
  type NightWindow,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MemberTonesProvider } from '#/components/ui/avatar';
import { ChairScreen, type ChairActions, type ChairData } from '#/features/chair/chair-screen';
import { useNapPrompt } from '#/features/nap-prompt';
import {
  useRemoveEntry,
  useResumeFeed,
  useSaveEvent,
  useSessionAction,
  useStartSession,
  useUnits,
} from '#/lib/use-events';
import { useNow } from '#/lib/use-now';
import { useOnline } from '#/lib/use-online';
import { useScreenWakeLock } from '#/lib/wake-lock';

export const Route = createFileRoute('/_app/chair')({ component: ChairPage });

function ChairPage() {
  const { babble, baby, family } = Route.useRouteContext();
  const client = babble.client;
  const now = useNow(1000);
  const online = useOnline();
  const units = useUnits(client, baby.id);
  const running = useQuery(runningEventsQuery(client, baby.id)).data ?? [];
  const latest = useQuery(latestEventsQuery(client, baby.id)).data ?? [];
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const start = useStartSession(client, baby.id);
  const session = useSessionAction(client, baby.id);
  const save = useSaveEvent(client, baby.id);
  const remove = useRemoveEntry(client, baby.id);
  const resume = useResumeFeed(client, baby.id);
  const showNapPrompt = useNapPrompt();
  const [lastTouchAt, setLastTouchAt] = useState(() => clock.now().getTime());
  const tones = useMemo(() => memberTones(family.members), [family.members]);
  useScreenWakeLock(true);

  const night: NightWindow | null = settings
    ? { timeZone: baby.timezone, start: settings.night_start_minutes, end: settings.night_end_minutes }
    : null;
  const feed = runningBreastFeed(running);
  const nap = running.find((event) => event.type === 'sleep') ?? null;
  const due =
    settings && !feedRemindersQuiet(settings, now, baby.timezone)
      ? nextFeedDue([...latest, ...running], settings)
      : null;
  const startedBy = feed
    ? (family.members.find((member) => member.user_id === feed.createdBy)?.display_name ?? null)
    : null;

  const data: ChairData = {
    babyName: baby.name,
    age: babyAgeLabel(baby.birth_date, todayInTimeZone(baby.timezone, now)),
    clock: formatTimeOfDay(now.toISOString(), baby.timezone),
    night: chairIsNight(night, now),
    dimmed: chairDimmed(night, now, lastTouchAt),
    offline: !online,
    lastFeed: lastFeedLine(latest, now, units),
    due: due ? feedDueText(due, now, baby.timezone) : null,
    suggested: nextBreastSide(latest),
    feed: feed && {
      id: feed.id,
      view: chairFeedView(feed, now),
      summary: chairFeedSummary(feed, now),
      startedLine: `Started ${formatTimeOfDay(feed.startedAt, baby.timezone)}${startedBy ? ` by ${startedBy}` : ''}`,
      startedBy,
    },
    nap: nap?.type === 'sleep' ? formatDuration(summariseSleep(nap, now).asleepMs, { seconds: false }) : null,
    lastNappy: lastNappyLine(latest, now),
    nappyDue: nappyPromptOnFeedStart(latest, now.toISOString()) !== null,
    units,
    bottle: { amount: defaultBottleAmount(latest, units), content: defaultBottleContent(latest) },
  };

  const actions: ChairActions = {
    startFeed: (side) => {
      showNapPrompt(napPromptOnFeedStart(running, clock.now().toISOString()));
      return start.mutateAsync({ type: 'breast_feed', side });
    },
    switchSide: (side) => feed && session.mutate({ event: feed, action: { kind: 'switch', side } }),
    pause: () => feed && session.mutate({ event: feed, action: { kind: 'pause' } }),
    resume: (side) => feed && session.mutate({ event: feed, action: { kind: 'resume', side } }),
    endFeed: async () => {
      if (feed) await session.mutateAsync({ event: feed, action: { kind: 'end' } });
    },
    resumeFeed: (feedId) => resume.mutateAsync(feedId),
    saveBottle: (amount, content) => save.mutateAsync({ draft: chairBottleDraft(amount, content, units, clock.now()) }),
    saveNappy: (type) => save.mutateAsync({ draft: chairNappyDraft(type, clock.now()) }),
    startNap: () => start.mutateAsync({ type: 'sleep' }),
    endNap: async () => {
      if (nap) await session.mutateAsync({ event: nap, action: { kind: 'end' } });
    },
    undoEntry: (eventId) => remove.mutateAsync(eventId),
    wake: () => setLastTouchAt(clock.now().getTime()),
  };

  return (
    <MemberTonesProvider value={tones}>
      <ChairScreen data={data} actions={actions} />
    </MemberTonesProvider>
  );
}
