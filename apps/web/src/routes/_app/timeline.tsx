import {
  daySummaryStrip,
  dayTotalCards,
  predictedLayout,
  predictionText,
  weekSummaryStrip,
  weekTableRows,
  TIMELINE_SPAN,
  type DayLayout,
  type DaySummary,
  type PredictedItem,
  type TimelineTick,
  type TimelineView,
  type Units,
} from '@babble/domain';
import { familyHasFeature } from '@babble/config';
import { sampleMonthView } from '@babble/api/fixtures';
import { useUnits } from '@babble/api/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { PredictionLine } from '#/features/home-overview';
import { PlusBadge } from '#/features/plus-dialog';
import { DayTimeline } from '#/features/timeline/day-timeline';
import { DayTotals, SummaryStrip, WeekTable } from '#/features/timeline/totals';
import { WeekTimeline } from '#/features/timeline/week-timeline';
import { MonthTimeline } from '#/features/timeline/month-timeline';
import { PlusMask } from '#/features/plus-mask';
import { cn } from '#/lib/cn';
import { useNow } from '#/lib/use-now';
import { usePrediction } from '#/lib/use-prediction';
import { useTimelineModel } from '#/lib/use-timeline';

type View = TimelineView;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute('/_app/timeline')({
  validateSearch: (search: Record<string, unknown>): { view?: View; date?: string } => ({
    view:
      search.view === '7d' || search.view === '30d' || search.view === 'day' || search.view === '24h'
        ? search.view
        : undefined,
    date: typeof search.date === 'string' && DAY_KEY.test(search.date) ? search.date : undefined,
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const { babble, baby, family } = Route.useRouteContext();
  const { view = 'day', date } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const now = useNow(60_000);
  const units = useUnits(babble.client, baby.id);
  const insightsLocked = !familyHasFeature(babble.config.billingEnabled, family.plan, 'insights');
  const sampleOnly = view === '30d' && insightsLocked;
  const { range, model } = useTimelineModel({
    client: babble.client,
    babyId: baby.id,
    baby,
    view,
    date,
    now,
    enabled: !sampleOnly,
  });
  const prediction = usePrediction(babble, baby, family, now);
  const step = TIMELINE_SPAN[view];
  const showsToday = view === 'day' && range.dayKey === range.todayKey;
  const predicted =
    showsToday && model?.view === 'day' ? predictedLayout(prediction, model.day.window, now, baby.timezone) : null;
  const predictionLine = showsToday ? predictionText(prediction, baby.timezone) : null;
  const plus = babble.config.billingEnabled;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-bold">Timeline</h1>
        <div className="w-72">
          <Segmented<View>
            label="Timeline view"
            value={view}
            onChange={(next) => void navigate({ search: { view: next, date } })}
            options={[
              { value: 'day', label: 'Day' },
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ]}
          />
        </div>
      </div>
      {view === '24h' ? (
        <p className="flex min-h-tap items-center justify-center text-row-title font-semibold">Last 24 hours</p>
      ) : (
        <div className="flex items-center justify-between">
          <Link
            to="/timeline"
            search={{ view, date: range.previousKey }}
            aria-label={view === 'day' ? 'Previous day' : `Previous ${step} days`}
            className="grid size-tap place-items-center rounded-full bg-surface hover:bg-line"
          >
            <ChevronLeft className="size-5" strokeWidth={2.75} />
          </Link>
          <span className="text-row-title font-semibold" aria-live="polite">
            {range.rangeLabel}
          </span>
          <Link
            to="/timeline"
            search={{ view, date: range.nextKey }}
            aria-label={view === 'day' ? 'Next day' : `Next ${step} days`}
            aria-disabled={!range.canGoNext}
            tabIndex={range.canGoNext ? undefined : -1}
            className={cn(
              'grid size-tap place-items-center rounded-full bg-surface hover:bg-line',
              !range.canGoNext && 'pointer-events-none opacity-40',
            )}
          >
            <ChevronRight className="size-5" strokeWidth={2.75} />
          </Link>
        </div>
      )}

      {sampleOnly ? (
        <PlusMask
          feature="insights"
          title="30-day timeline"
          body={`See a month of ${baby.name}'s sleep and feeds, one row a day, to spot patterns as they form.`}
        >
          <SampleMonth now={now} />
        </PlusMask>
      ) : !model ? (
        <PageSpinner />
      ) : model.view === 'day' ? (
        <DayPanel
          summary={model.day.summary}
          layout={model.day.layout}
          ticks={model.ticks}
          nowFrac={model.nowFrac}
          now={now}
          units={units}
          timeZone={baby.timezone}
          predicted={predicted}
          before={predictionLine && <PredictionLine text={predictionLine} plus={plus} />}
          after={
            predicted &&
            (predicted.sleep.length > 0 || predicted.feeds.length > 0) && (
              <p className="flex items-center gap-2 text-caption text-ink-3">
                {plus && <PlusBadge />}
                Dashed blocks show likely sleeps and feeds for the next few hours.
              </p>
            )
          }
        />
      ) : model.view === '24h' ? (
        <DayPanel
          summary={model.summary}
          layout={model.layout}
          ticks={model.ticks}
          nowFrac={model.nowFrac}
          now={now}
          units={units}
          timeZone={baby.timezone}
        />
      ) : model.view === '30d' ? (
        <div className="flex flex-col gap-4">
          <SummaryStrip items={weekSummaryStrip(model.week)} />
          <MonthTimeline
            days={model.days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
            ticks={model.ticks}
            todayKey={model.todayKey}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SummaryStrip items={weekSummaryStrip(model.week)} />
          <WeekTimeline
            days={model.days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
            ticks={model.ticks}
            todayKey={model.todayKey}
          />
          <WeekTable
            dayKeys={model.keys}
            rows={weekTableRows(
              model.days.map((day) => day.summary),
              model.week,
              units,
            )}
          />
        </div>
      )}
    </div>
  );
}

function DayPanel({
  summary,
  layout,
  ticks,
  nowFrac,
  now,
  units,
  timeZone,
  predicted,
  before,
  after,
}: {
  summary: DaySummary;
  layout: DayLayout;
  ticks: TimelineTick[];
  nowFrac: number | null;
  now: Date;
  units: Units;
  timeZone: string;
  predicted?: { sleep: PredictedItem[]; feeds: PredictedItem[] } | null;
  before?: ReactNode;
  after?: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
      <div className="flex flex-col gap-4">
        <div className="md:hidden">
          <SummaryStrip items={daySummaryStrip(summary)} />
        </div>
        {before}
        <DayTimeline
          layout={layout}
          ticks={ticks}
          timeZone={timeZone}
          units={units}
          nowFrac={nowFrac}
          now={now}
          predicted={predicted}
        />
        {after}
      </div>
      <DayTotals cards={dayTotalCards(summary, units, timeZone)} />
    </div>
  );
}

function SampleMonth({ now }: { now: Date }) {
  const sample = useMemo(() => sampleMonthView(now), [now]);
  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip items={weekSummaryStrip(sample.week)} />
      <MonthTimeline days={sample.days} ticks={sample.ticks} todayKey={sample.todayKey} linkDays={false} />
    </div>
  );
}
