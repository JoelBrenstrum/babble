import { babySettingsQuery, latestEventsQuery, runningEventsQuery } from '@babble/api';
import {
  comparisonToggleLabel,
  feedDueFor,
  feedDueMarker,
  filterLayout,
  parseTimelineLanes,
  shownLanes,
  daySummaryStrip,
  dayTotalCards,
  predictedLayout,
  predictionText,
  weekSummaryStrip,
  weekTableRows,
  TIMELINE_SPAN,
  type DayComparison,
  type DayLayout,
  type FeedDueMarker,
  type DaySummary,
  type PredictedItem,
  type TimelineLane,
  type TimelineTick,
  type TimelineView,
  type Units,
} from '@babble/domain';
import { familyHasFeature } from '@babble/config';
import { sampleMonthView } from '@babble/api/fixtures';
import { useUnits } from '@babble/api/react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { PredictionLine } from '#/features/home-overview';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';
import { DayComparisonCard } from '#/features/timeline/day-comparison';
import { DayTimeline } from '#/features/timeline/day-timeline';
import { LaneToggles } from '#/features/timeline/lane-toggles';
import { DayTotals, SummaryStrip, WeekTable } from '#/features/timeline/totals';
import { WeekTimeline } from '#/features/timeline/week-timeline';
import { MonthTimeline } from '#/features/timeline/month-timeline';
import { PlusMask } from '#/features/plus-mask';
import { cn } from '#/lib/cn';
import { useNow } from '#/lib/use-now';
import { usePrediction } from '#/lib/use-prediction';
import { useDayComparison, useRollingComparison, useTimelineModel } from '#/lib/use-timeline';

type View = TimelineView;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute('/_app/timeline')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: View; date?: string; compare?: boolean; show?: string } => ({
    view:
      search.view === '7d' || search.view === '30d' || search.view === 'day' || search.view === '24h'
        ? search.view
        : undefined,
    date: typeof search.date === 'string' && DAY_KEY.test(search.date) ? search.date : undefined,
    compare: search.compare === true || search.compare === 'true' ? true : undefined,
    show: parseTimelineLanes(search.show),
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const { babble, baby, family } = Route.useRouteContext();
  const { view = 'day', date, compare, show } = Route.useSearch();
  const lanes = shownLanes(show);
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
  const [pitching, setPitching] = useState(false);
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const latest = useQuery({ ...latestEventsQuery(babble.client, baby.id), enabled: !insightsLocked }).data;
  const running = useQuery({ ...runningEventsQuery(babble.client, baby.id), enabled: !insightsLocked }).data;
  const due = insightsLocked ? null : feedDueFor(latest ?? [], running ?? [], settings, now, baby.timezone);
  const feedDue = !lanes.includes('feeds')
    ? null
    : model?.view === 'day'
      ? feedDueMarker(due, model.day.window, now, baby.timezone)
      : model?.view === '24h'
        ? feedDueMarker(due, model.window, now, baby.timezone)
        : null;
  const comparing = (view === 'day' || view === '24h') && Boolean(compare) && !insightsLocked;
  const toggleCompare = () =>
    insightsLocked
      ? setPitching(true)
      : void navigate({ search: { view, date, compare: compare ? undefined : true, show } });
  const rolling = useRollingComparison({
    client: babble.client,
    babyId: baby.id,
    baby,
    window: model?.view === '24h' ? model.window : null,
    current: model?.view === '24h' ? model.summary : null,
    enabled: comparing && view === '24h',
  });
  const comparison = useDayComparison({
    client: babble.client,
    babyId: baby.id,
    baby,
    dayKey: range.dayKey,
    todayKey: range.todayKey,
    current: model?.view === 'day' ? model.day.summary : null,
    now,
    enabled: comparing && view === 'day',
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-bold">Timeline</h1>
        <div className="w-72">
          <Segmented<View>
            label="Timeline view"
            value={view}
            onChange={(next) => void navigate({ search: { view: next, date, compare, show } })}
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
        <div className="flex min-h-tap items-center justify-center gap-2">
          <p className="text-row-title font-semibold">Last 24 hours</p>
          <CompareButton
            comparing={comparing}
            label="Compare with the 24 hours before"
            locked={insightsLocked}
            plus={plus}
            onPress={toggleCompare}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Link
            to="/timeline"
            search={{ view, date: range.previousKey, compare, show }}
            aria-label={view === 'day' ? 'Previous day' : `Previous ${step} days`}
            className="grid size-tap place-items-center rounded-full bg-surface hover:bg-line"
          >
            <ChevronLeft className="size-5" strokeWidth={2.75} />
          </Link>
          <span className="flex items-center gap-2">
            <span className="text-row-title font-semibold" aria-live="polite">
              {range.rangeLabel}
            </span>
            {view === 'day' && (
              <CompareButton
                comparing={comparing}
                label={comparisonToggleLabel(range.dayKey, range.todayKey)}
                locked={insightsLocked}
                plus={plus}
                onPress={toggleCompare}
              />
            )}
          </span>
          <Link
            to="/timeline"
            search={{ view, date: range.nextKey, compare, show }}
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

      <LaneToggles
        show={show}
        onChange={(next) =>
          void navigate({
            search: { view, date, compare, show: next },
            replace: true,
            state: (prev) => ({ ...prev, keepScroll: true }),
          })
        }
      />

      {pitching && <PlusDialog feature="insights" onClose={() => setPitching(false)} />}

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
          lanes={lanes}
          ticks={model.ticks}
          nowFrac={model.nowFrac}
          now={now}
          units={units}
          timeZone={baby.timezone}
          predicted={predicted}
          feedDue={feedDue}
          currentLabel={range.rangeLabel}
          comparison={comparing ? (comparison ?? 'loading') : null}
          plusBadge={plus}
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
          lanes={lanes}
          ticks={model.ticks}
          nowFrac={model.nowFrac}
          now={now}
          units={units}
          timeZone={baby.timezone}
          feedDue={feedDue}
          currentLabel="Last 24h"
          comparison={comparing ? (rolling ?? 'loading') : null}
          plusBadge={plus}
        />
      ) : model.view === '30d' ? (
        <div className="flex flex-col gap-4">
          <SummaryStrip items={weekSummaryStrip(model.week)} />
          <MonthTimeline
            days={model.days.map((day) => ({
              dayKey: day.dayKey,
              layout: day.layout && filterLayout(day.layout, lanes),
            }))}
            ticks={model.ticks}
            todayKey={model.todayKey}
            lanes={lanes}
            show={show}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SummaryStrip items={weekSummaryStrip(model.week)} />
          <WeekTimeline
            days={model.days.map((day) => ({
              dayKey: day.dayKey,
              layout: day.layout && filterLayout(day.layout, lanes),
            }))}
            ticks={model.ticks}
            todayKey={model.todayKey}
            lanes={lanes}
            show={show}
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
  lanes,
  ticks,
  nowFrac,
  now,
  units,
  timeZone,
  predicted,
  feedDue = null,
  currentLabel,
  comparison = null,
  plusBadge = false,
  before,
  after,
}: {
  summary: DaySummary;
  layout: DayLayout;
  lanes: readonly TimelineLane[];
  ticks: TimelineTick[];
  nowFrac: number | null;
  now: Date;
  units: Units;
  timeZone: string;
  predicted?: { sleep: PredictedItem[]; feeds: PredictedItem[] } | null;
  feedDue?: FeedDueMarker | null;
  currentLabel?: string;
  comparison?: DayComparison | 'loading' | null;
  plusBadge?: boolean;
  before?: ReactNode;
  after?: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
      <div className="flex flex-col gap-4">
        {!comparison && (
          <div className="md:hidden">
            <SummaryStrip items={daySummaryStrip(summary)} />
          </div>
        )}
        {before}
        {comparison ? (
          <div className="grid grid-cols-2 gap-3" data-testid="day-comparison-timelines">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-meta font-semibold text-ink-2">
                {comparison === 'loading' ? '…' : comparison.previousLabel}
              </span>
              {comparison === 'loading' ? (
                <PageSpinner />
              ) : (
                <DayTimeline
                  layout={comparison.layout}
                  lanes={lanes}
                  ticks={ticks}
                  timeZone={timeZone}
                  units={units}
                  nowFrac={comparison.cutoffFrac}
                  now={now}
                  compact
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-meta font-semibold">{currentLabel}</span>
              <DayTimeline
                layout={layout}
                lanes={lanes}
                ticks={ticks}
                timeZone={timeZone}
                units={units}
                nowFrac={nowFrac}
                now={now}
                predicted={predicted}
                feedDue={feedDue}
                compact
              />
            </div>
          </div>
        ) : (
          <DayTimeline
            layout={layout}
            lanes={lanes}
            ticks={ticks}
            timeZone={timeZone}
            units={units}
            nowFrac={nowFrac}
            now={now}
            predicted={predicted}
            feedDue={feedDue}
          />
        )}
        {after}
      </div>
      <div className="flex flex-col gap-3">
        {comparison && comparison !== 'loading' && (
          <DayComparisonCard comparison={comparison} currentLabel={currentLabel ?? ''} plusBadge={plusBadge} />
        )}
        {!comparison && <DayTotals cards={dayTotalCards(summary, units, timeZone)} />}
      </div>
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

function CompareButton({
  comparing,
  label,
  locked,
  plus,
  onPress,
}: {
  comparing: boolean;
  label: string;
  locked: boolean;
  plus: boolean;
  onPress: () => void;
}) {
  const title = comparing ? 'Stop comparing' : label;
  return (
    <button
      type="button"
      aria-pressed={comparing}
      aria-label={title}
      title={title}
      onClick={onPress}
      className={cn(
        'relative grid size-tap place-items-center rounded-full',
        comparing ? 'bg-primary text-ink-on-solid' : 'bg-surface text-ink hover:bg-line',
      )}
    >
      <ArrowLeftRight className="size-5" strokeWidth={2.75} />
      {plus && locked && (
        <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <Sparkles aria-hidden className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
