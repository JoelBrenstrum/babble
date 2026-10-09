import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { useMemo, useState, type ReactNode } from 'react';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { DayTimeline } from '#/features/timeline/day-timeline';
import { DayTotals } from '#/features/timeline/totals';
import { fixtureClient } from '#/fixtures/client';
import { cn } from '#/lib/cn';
import { homePreview, timelinePreview } from './preview-data';

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
  const { running, latest, summary } = useMemo(() => homePreview(now), [now]);
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
  const { layout, ticks, nowFrac, totals } = useMemo(() => timelinePreview(now), [now]);
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
      <PreviewFrame
        label="Preview of a day on the babble timeline: sleeps, feeds and nappies laid out from 7am, with a nap running now."
        caption="A day at a glance. Sleep, feeds and nappies line up by the hour."
        className="max-h-[26rem] md:max-h-[32rem]"
        fade
      >
        <DayTimeline layout={layout} ticks={ticks} timeZone={sampleBaby.timezone} units="metric" nowFrac={nowFrac} />
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
