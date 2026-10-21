import {
  comparisonToggleLabel,
  dayRhythmCards,
  filterLayout,
  parseTimelineLanes,
  shownLanes,
  predictedLayout,
  predictionText,
  weekSummaryStrip,
  weekTableRows,
  TIMELINE_SPAN,
  TIMELINE_VIEWS,
  type TimelineView,
} from '@babble/domain';
import { familyHasFeature } from '@babble/config';
import {
  useDayComparison,
  useDayRhythm,
  useNow,
  usePrediction,
  useRollingComparison,
  useTimelineMarkers,
  useTimelineModel,
  useUnits,
} from '@babble/api/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { PredictionLine } from '#/features/home-overview';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';
import { CompareButton } from '#/features/timeline/compare-button';
import { DayPanel, dayPanelView, isDayModel } from '#/features/timeline/day-panel';
import { LaneToggles } from '#/features/timeline/lane-toggles';
import { SampleMonth } from '#/features/timeline/sample-month';
import { SummaryStrip, WeekTable } from '#/features/timeline/totals';
import { WeekTimeline } from '#/features/timeline/week-timeline';
import { MonthTimeline } from '#/features/timeline/month-timeline';
import { PlusMask } from '#/features/plus-mask';
import { cn } from '#/lib/cn';
import { parseBooleanParam, parseOptionParam } from '#/lib/search-params';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute('/_app/timeline')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: TimelineView; date?: string; compare?: boolean; show?: string } => ({
    view: parseOptionParam(search.view, TIMELINE_VIEWS),
    date: typeof search.date === 'string' && DAY_KEY.test(search.date) ? search.date : undefined,
    compare: parseBooleanParam(search.compare),
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
  const prediction = usePrediction(babble.client, babble.config.billingEnabled, baby, family, now);
  const step = TIMELINE_SPAN[view];
  const showsToday = view === 'day' && range.dayKey === range.todayKey;
  const predicted =
    showsToday && model?.view === 'day' ? predictedLayout(prediction, model.day.window, now, baby.timezone) : null;
  const predictionLine = showsToday ? predictionText(prediction, baby.timezone) : null;
  const plus = babble.config.billingEnabled;
  const [pitching, setPitching] = useState(false);
  const markers = useTimelineMarkers({
    client: babble.client,
    babyId: baby.id,
    timeZone: baby.timezone,
    model,
    now,
    lanes,
    enabled: !insightsLocked,
  });
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

  const rhythm = useDayRhythm({
    client: babble.client,
    babyId: baby.id,
    baby,
    dayKey: range.dayKey,
    now,
    enabled: view === 'day' && !insightsLocked,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-bold">Timeline</h1>
        <div className="w-72">
          <Segmented<TimelineView>
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
      ) : isDayModel(model) ? (
        <DayPanel
          view={dayPanelView(model)}
          markers={markers}
          lanes={lanes}
          now={now}
          units={units}
          timeZone={baby.timezone}
          predicted={predicted}
          rhythm={rhythm && model.view === 'day' ? dayRhythmCards(rhythm, showsToday) : []}
          currentLabel={model.view === 'day' ? range.rangeLabel : 'Last 24h'}
          comparison={comparing ? ((model.view === 'day' ? comparison : rolling) ?? 'loading') : null}
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
