import { babySettingsQuery, eventsBetweenQuery } from '@babble/api';
import {
  countedDays,
  dayKeyFor,
  dayLayout,
  daySummaryStrip,
  dayTotalCards,
  dayWindow,
  bucketByDay,
  formatDayLabel,
  formatDayRange,
  fractionOf,
  hourTicks,
  shiftDay,
  summariseDay,
  summariseWeek,
  lastDays,
  weekSummaryStrip,
  weekTableRows,
  type DaySummary,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { DayTimeline } from '#/features/timeline/day-timeline';
import { DayTotals, SummaryStrip, WeekTable } from '#/features/timeline/totals';
import { WeekTimeline } from '#/features/timeline/week-timeline';
import { cn } from '#/lib/cn';
import { useUnits } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';

type View = 'day' | '7d';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute('/_app/timeline')({
  validateSearch: (search: Record<string, unknown>): { view?: View; date?: string } => ({
    view: search.view === '7d' || search.view === 'day' ? search.view : undefined,
    date: typeof search.date === 'string' && DAY_KEY.test(search.date) ? search.date : undefined,
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const { babble, baby } = Route.useRouteContext();
  const { view = 'day', date } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const now = useNow(60_000);
  const units = useUnits(babble.client, baby.id);
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const dayKey = date && date <= todayKey ? date : todayKey;
  const keys = view === 'day' ? [dayKey] : lastDays(dayKey, 7);
  const from = dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes).start.toISOString();
  const to = dayWindow(keys.at(-1)!, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery(eventsBetweenQuery(babble.client, baby.id, from, to));

  const step = view === 'day' ? 1 : 7;
  const previousKey = shiftDay(dayKey, -step);
  const nextKey = shiftDay(dayKey, step) < todayKey ? shiftDay(dayKey, step) : todayKey;
  const canGoNext = dayKey < todayKey;
  const rangeLabel = view === 'day' ? formatDayLabel(dayKey, todayKey) : formatDayRange(keys);

  const days = bucketByDay(events.data ?? [], keys, baby.timezone, baby.day_start_minutes, now).map((day) => {
    const future = day.dayKey > todayKey;
    const summary: DaySummary | null = future
      ? null
      : summariseDay(day.events, day.window, {
          now,
          mergeGapMs: settings && settings.downtime_merge_threshold_sec * 1000,
          night: settings && {
            dayKey: day.dayKey,
            timeZone: baby.timezone,
            startMinutes: settings.night_start_minutes,
            endMinutes: settings.night_end_minutes,
          },
        });
    return { ...day, summary, layout: future ? null : dayLayout(day.events, day.window, now) };
  });

  const counted = new Set(countedDays(keys, todayKey));
  const week = summariseWeek(days.flatMap((day) => (counted.has(day.dayKey) && day.summary ? [day.summary] : [])));
  const today = days[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-bold">Timeline</h1>
        <div className="w-40">
          <Segmented<View>
            label="Timeline view"
            value={view}
            onChange={(next) => void navigate({ search: { view: next, date } })}
            options={[
              { value: 'day', label: 'Day' },
              { value: '7d', label: '7d' },
            ]}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Link
          to="/timeline"
          search={{ view, date: previousKey }}
          aria-label={view === 'day' ? 'Previous day' : 'Previous 7 days'}
          className="grid size-tap place-items-center rounded-full bg-surface hover:bg-line"
        >
          <ChevronLeft className="size-5" strokeWidth={2.75} />
        </Link>
        <span className="text-row-title font-semibold" aria-live="polite">
          {rangeLabel}
        </span>
        <Link
          to="/timeline"
          search={{ view, date: nextKey }}
          aria-label={view === 'day' ? 'Next day' : 'Next 7 days'}
          aria-disabled={!canGoNext}
          tabIndex={canGoNext ? undefined : -1}
          className={cn(
            'grid size-tap place-items-center rounded-full bg-surface hover:bg-line',
            !canGoNext && 'pointer-events-none opacity-40',
          )}
        >
          <ChevronRight className="size-5" strokeWidth={2.75} />
        </Link>
      </div>

      {events.isPending ? (
        <PageSpinner />
      ) : view === 'day' ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
          <div className="flex flex-col gap-4">
            <div className="md:hidden">
              <SummaryStrip items={daySummaryStrip(today.summary!)} />
            </div>
            <DayTimeline
              layout={today.layout!}
              ticks={hourTicks(dayKey, baby.timezone, baby.day_start_minutes, 3)}
              timeZone={baby.timezone}
              units={units}
              nowFrac={dayKey === todayKey ? fractionOf(today.window, now.getTime()) : null}
            />
          </div>
          <DayTotals cards={dayTotalCards(today.summary!, units, baby.timezone)} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SummaryStrip items={weekSummaryStrip(week)} />
          <WeekTimeline
            days={days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
            ticks={hourTicks(keys[0]!, baby.timezone, baby.day_start_minutes, 6)}
            todayKey={todayKey}
          />
          <WeekTable
            dayKeys={keys}
            rows={weekTableRows(
              days.map((day) => day.summary),
              week,
              units,
            )}
          />
        </div>
      )}
    </div>
  );
}
