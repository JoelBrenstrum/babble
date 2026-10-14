import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { useMemo, useState, type ReactNode } from 'react';
import { ChairScreen, type ChairActions } from '#/features/chair/chair-screen';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { DayTimeline } from '#/features/timeline/day-timeline';
import { DayTotals } from '#/features/timeline/totals';
import { fixtureClient } from '#/fixtures/client';
import { cn } from '#/lib/cn';
import { StatsCards } from '#/features/stats/stats-cards';
import { WeeklySummaryCard } from '#/features/stats/weekly-summary';
import { MonthTimeline } from '#/features/timeline/month-timeline';
import { chairPreview, homePreview, monthPreview, pausePreview, timelinePreview } from './preview-data';

function PreviewFrame({
  label,
  caption,
  className,
  fade = false,
  children,
}: {
  label: string;
  caption?: ReactNode;
  className?: string;
  fade?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <div
        role="img"
        aria-label={label}
        className={cn(
          'relative overflow-hidden rounded-sheet border border-line bg-bg p-2 shadow-sheet sm:p-4',
          className,
        )}
      >
        <div inert aria-hidden className="pointer-events-none select-none">
          {children}
        </div>
        {fade && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-bg" />}
      </div>
      {caption && <figcaption className="text-center text-meta text-ink-2">{caption}</figcaption>}
    </figure>
  );
}

export function HomePreview({ now: fixedNow }: { now?: Date }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const { running, latest, summary, prediction } = useMemo(() => homePreview(now), [now]);
  return (
    <PreviewFrame
      label="Preview of the babble home screen: a breastfeed timer running on the right side, today's sleep, feeds and nappies, and a list of things to track."
      className="max-h-[38rem]"
      fade
    >
      <HomeOverview
        baby={sampleBaby}
        now={now}
        units="metric"
        running={running}
        latest={latest}
        summary={summary}
        prediction={prediction}
        renderRunning={(event) => (
          <RunningCard
            event={event}
            client={fixtureClient}
            timeZone={sampleBaby.timezone}
            members={sampleFamily.members}
          />
        )}
      />
    </PreviewFrame>
  );
}

export function TimelinePreview({ now: fixedNow }: { now?: Date }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const { now: anchor, layout, ticks, nowFrac, totals, predicted } = useMemo(() => timelinePreview(now), [now]);
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
      <PreviewFrame
        label="Preview of a day on the babble timeline: sleeps, feeds and nappies laid out from 7am, with a nap running now."
        caption="A day at a glance. Dashed blocks show the naps and feeds likely to come next."
        className="max-h-[26rem] md:max-h-[32rem]"
        fade
      >
        <DayTimeline
          layout={layout}
          ticks={ticks}
          timeZone={sampleBaby.timezone}
          units="metric"
          now={anchor}
          nowFrac={nowFrac}
          predicted={predicted}
        />
      </PreviewFrame>
      <PreviewFrame
        label="Preview of the day's totals: hours of sleep, number of feeds and nappies, with details for each."
        caption="Totals for the day, ready for the next check-up."
      >
        <DayTotals cards={totals} />
      </PreviewFrame>
    </div>
  );
}

export function PausePreview({ now: fixedNow }: { now?: Date }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const { feed, nap } = useMemo(() => pausePreview(now), [now]);
  const card = (event: BabyEvent) => (
    <RunningCard event={event} client={fixtureClient} timeZone={sampleBaby.timezone} members={sampleFamily.members} />
  );
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2 md:items-start">
      <PreviewFrame
        label="Preview of a paused breastfeed: both sides timed, paused for about a minute, with the idle time counted separately."
        caption="A burp break is just a pause. The feed carries on as one entry, and the gap counts as idle time."
      >
        {card(feed)}
      </PreviewFrame>
      <PreviewFrame
        label="Preview of a paused nap: awake now, with time asleep and two wake-ups shown."
        caption="Woke for a cuddle? Pause the nap, then resume it. babble counts time asleep and the wake-ups."
      >
        {card(nap)}
      </PreviewFrame>
    </div>
  );
}

const noop = async () => '';
const PREVIEW_ACTIONS: ChairActions = {
  startFeed: noop,
  switchSide: () => undefined,
  pause: () => undefined,
  resume: () => undefined,
  endFeed: noop,
  resumeFeed: noop,
  saveBottle: noop,
  saveNappy: noop,
  startNap: noop,
  endNap: noop,
  pauseNap: () => undefined,
  resumeNap: () => undefined,
  undoEntry: noop,
  restoreEntry: noop,
  wake: () => ({ screenWasOff: false }),
  dimNow: () => undefined,
  refresh: () => undefined,
  enterFullscreen: () => undefined,
  exitFullscreen: () => undefined,
};

export function ChairPreview({ now: fixedNow }: { now?: Date }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const { idle, feeding } = useMemo(() => chairPreview(now), [now]);
  const screen = (data: typeof idle) => (
    <div className="relative aspect-video overflow-hidden rounded-card">
      <ChairScreen data={data} actions={PREVIEW_ACTIONS} embedded />
    </div>
  );
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2 md:items-start">
      <PreviewFrame
        label="Preview of chair mode waiting for the next feed: when Olivia last fed, when the next feed is due, giant Left and Right buttons with Left marked next, and Bottle, Nappy and Sleep buttons."
        caption="Between feeds: when the last one was, what's due, and which side is next."
      >
        {screen(idle)}
      </PreviewFrame>
      <PreviewFrame
        label="Preview of chair mode during a night feed, in the dark theme: a giant timer, time on each side, and big Switch, Pause and End feed buttons."
        caption="During a feed: one big timer and three big buttons, dark at night."
      >
        {screen(feeding)}
      </PreviewFrame>
    </div>
  );
}

export function PatternsPreview({ now: fixedNow, plusBadges = false }: { now?: Date; plusBadges?: boolean }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const { days, ticks, todayKey, insights } = useMemo(() => monthPreview(now), [now]);
  const night = insights.night ? [insights.night] : [];
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <PreviewFrame
        label="Preview of a 30-day timeline: one row per day, with naps settling into place and the first night stretch getting longer towards the bottom."
        caption="A month, one row a day. The night stretch grows as the weeks go by."
      >
        <MonthTimeline days={days} ticks={ticks} todayKey={todayKey} linkDays={false} />
      </PreviewFrame>
      <div className="flex min-w-0 flex-col gap-6">
        {insights.weekly && (
          <PreviewFrame
            label="Preview of the weekly summary: this week compared with last week, led by the biggest change in sleep."
            caption="Every week, what changed and by how much."
          >
            <WeeklySummaryCard summary={insights.weekly} plusBadge={plusBadges} compact />
          </PreviewFrame>
        )}
        {night.length > 0 && (
          <PreviewFrame
            label="Preview of the night sleep card: the longest stretch last night and on average, with a chart of the last two weeks."
            caption="Night sleep and wake windows, tracked for you."
          >
            <StatsCards cards={night} plusBadges={plusBadges} columns={1} />
          </PreviewFrame>
        )}
      </div>
    </div>
  );
}
