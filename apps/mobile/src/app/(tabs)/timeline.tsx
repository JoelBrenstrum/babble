import { babySettingsQuery, eventsBetweenQuery } from '@babble/api';
import {
  daySummaryStrip,
  dayTotalCards,
  predictedLayout,
  predictionText,
  timelineModel,
  timelineRange,
  weekSummaryStrip,
  weekTableRows,
  type TimelineView,
} from '@babble/domain';
import { familyHasFeature } from '@babble/config';
import { sampleMonthView } from '@babble/api/fixtures';
import { useUnits } from '@babble/api/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { PlusBadge } from '@/components/plus';
import { PredictionLine } from '@/features/home-overview';
import { DayTimeline } from '@/features/timeline/day-timeline';
import { DayTotals, SummaryStrip, WeekTable } from '@/features/timeline/totals';
import { WeekTimeline } from '@/features/timeline/week-timeline';
import { MonthTimeline } from '@/features/timeline/month-timeline';
import { PlusMask } from '@/features/plus-mask';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useNow } from '@/lib/use-now';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';
import { usePrediction } from '@/lib/use-prediction';

export default function TimelineTab() {
  const ready = useReadyState();
  if (!ready) return null;
  return <TimelineContent family={ready.family} baby={ready.baby} />;
}

function TimelineContent({ family, baby }: Pick<ReadyState, 'family' | 'baby'>) {
  const { client, config } = useBabble();
  const now = useNow(60_000);
  const units = useUnits(client, baby.id);
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const ink = useTokenColor('--ink');
  const [view, setView] = useState<TimelineView>('day');
  const [date, setDate] = useState<string | null>(null);

  const range = timelineRange({ view, date, baby, now });
  const { dayKey, todayKey, keys, step, previousKey, nextKey, canGoNext, rangeLabel } = range;
  const insightsLocked = !familyHasFeature(config.billingEnabled, family.plan, 'insights');
  const sampleOnly = view === '30d' && insightsLocked;
  const events = useQuery({
    ...eventsBetweenQuery(client, baby.id, range.from, range.to),
    enabled: !sampleOnly,
    placeholderData: view === '24h' ? keepPreviousData : undefined,
  });
  const model = timelineModel({ view, date, events: events.data ?? [], settings, baby, now });

  const prediction = usePrediction(baby, family, now);
  const predicted =
    model.view === 'day' && dayKey === todayKey
      ? predictedLayout(prediction, model.day.window, now, baby.timezone)
      : null;
  const showsPrediction = Boolean(predicted && (predicted.sleep.length || predicted.feeds.length));
  const predictionLine = model.view === 'day' && dayKey === todayKey ? predictionText(prediction, baby.timezone) : null;
  const openDay = (key: string) => {
    setDate(key);
    setView('day');
  };

  return (
    <Screen edges={['top']}>
      <View className="gap-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="font-bold text-title text-ink">Timeline</Text>
          <View className="w-64">
            <Segmented<TimelineView>
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: 'Day' },
                { value: '24h', label: '24h' },
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
              ]}
            />
          </View>
        </View>
        {view === '24h' ? (
          <Text className="min-h-tap text-center font-semibold text-row-title text-ink">Last 24 hours</Text>
        ) : (
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view === 'day' ? 'Previous day' : `Previous ${step} days`}
              onPress={() => setDate(previousKey)}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface"
            >
              <ChevronLeft size={20} color={ink} strokeWidth={2.75} />
            </Pressable>
            <Text className="font-semibold text-row-title text-ink">{rangeLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view === 'day' ? 'Next day' : `Next ${step} days`}
              accessibilityState={{ disabled: !canGoNext }}
              disabled={!canGoNext}
              onPress={() => setDate(nextKey)}
              className={`h-11 w-11 items-center justify-center rounded-full bg-surface ${canGoNext ? '' : 'opacity-40'}`}
            >
              <ChevronRight size={20} color={ink} strokeWidth={2.75} />
            </Pressable>
          </View>
        )}

        {sampleOnly ? (
          <PlusMask
            feature="insights"
            title="30-day timeline"
            body={`See a month of ${baby.name}'s sleep and feeds, one row a day, to spot patterns as they form.`}
          >
            <SampleMonth now={now} />
          </PlusMask>
        ) : events.isPending ? (
          <PageSpinner />
        ) : model.view === '24h' ? (
          <>
            <SummaryStrip items={daySummaryStrip(model.summary)} />
            <DayTimeline
              layout={model.layout}
              ticks={model.ticks}
              timeZone={baby.timezone}
              units={units}
              now={now}
              nowFrac={model.nowFrac}
            />
            <DayTotals cards={dayTotalCards(model.summary, units, baby.timezone)} />
          </>
        ) : model.view === 'day' ? (
          <>
            <SummaryStrip items={daySummaryStrip(model.day.summary)} />
            {predictionLine && <PredictionLine text={predictionLine} plus={config.billingEnabled} />}
            <DayTimeline
              layout={model.day.layout}
              ticks={model.ticks}
              timeZone={baby.timezone}
              units={units}
              now={now}
              nowFrac={model.nowFrac}
              predicted={predicted}
            />
            {showsPrediction && (
              <View className="flex-row items-center gap-2">
                {config.billingEnabled && <PlusBadge />}
                <Text className="flex-1 font-sans text-caption text-ink-3">
                  Dashed blocks show likely sleeps and feeds for the next few hours.
                </Text>
              </View>
            )}
            <DayTotals cards={dayTotalCards(model.day.summary, units, baby.timezone)} />
          </>
        ) : model.view === '30d' ? (
          <>
            <SummaryStrip items={weekSummaryStrip(model.week)} />
            <MonthTimeline
              days={model.days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
              ticks={model.ticks}
              todayKey={todayKey}
              onOpenDay={openDay}
            />
          </>
        ) : (
          <>
            <SummaryStrip items={weekSummaryStrip(model.week)} />
            <WeekTimeline
              days={model.days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
              ticks={model.ticks}
              todayKey={todayKey}
              onOpenDay={openDay}
            />
            <WeekTable
              dayKeys={keys}
              rows={weekTableRows(
                model.days.map((day) => day.summary),
                model.week,
                units,
              )}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

function SampleMonth({ now }: { now: Date }) {
  const sample = useMemo(() => sampleMonthView(now), [now]);
  return (
    <>
      <SummaryStrip items={weekSummaryStrip(sample.week)} />
      <MonthTimeline days={sample.days} ticks={sample.ticks} todayKey={sample.todayKey} onOpenDay={() => undefined} />
    </>
  );
}
