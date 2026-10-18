import { babySettingsQuery } from '@babble/api';
import {
  comparisonToggleLabel,
  daySummaryStrip,
  filterLayout,
  parseTimelineLanes,
  shownLanes,
  dayTotalCards,
  predictedLayout,
  predictionText,
  timelineModel,
  weekSummaryStrip,
  weekTableRows,
  type DayComparison,
  type NightMarker,
  type TimelineLane,
  type TimelineTick,
  type TimelineView,
  type Units,
} from '@babble/domain';
import { familyHasFeature } from '@babble/config';
import { sampleMonthView } from '@babble/api/fixtures';
import {
  useDayComparison,
  useNow,
  usePrediction,
  useRollingComparison,
  useTimelineMarkers,
  useTimelineModel,
  useUnits,
} from '@babble/api/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { PredictionLine } from '@/features/home-overview';
import { DayComparisonCard } from '@/features/timeline/day-comparison';
import { DayTimeline } from '@/features/timeline/day-timeline';
import { LaneToggles } from '@/features/timeline/lane-toggles';
import { DayTotals, SummaryStrip, WeekTable } from '@/features/timeline/totals';
import { WeekTimeline } from '@/features/timeline/week-timeline';
import { MonthTimeline } from '@/features/timeline/month-timeline';
import { PlusMask } from '@/features/plus-mask';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

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
  const params = useLocalSearchParams<{ view?: string; date?: string; show?: string; at?: string }>();
  const [view, setView] = useState<TimelineView>('day');
  const [date, setDate] = useState<string | null>(null);
  const [show, setShow] = useState<string | undefined>(undefined);
  const lanes = shownLanes(show);
  useEffect(() => {
    if (!params.date) return;
    setView(params.view === '7d' ? '7d' : 'day');
    setDate(params.date);
    setShow(parseTimelineLanes(params.show));
  }, [params.view, params.date, params.show, params.at]);

  const insightsLocked = !familyHasFeature(config.billingEnabled, family.plan, 'insights');
  const sampleOnly = view === '30d' && insightsLocked;
  const timeline = useTimelineModel({
    client,
    babyId: baby.id,
    baby,
    view,
    date,
    now,
    enabled: !sampleOnly,
    placeholder: view === '24h' ? 'previous' : 'none',
  });
  const { range, pending } = timeline;
  const { dayKey, todayKey, keys, step, previousKey, nextKey, canGoNext, rangeLabel } = range;
  const model = timeline.model ?? timelineModel({ view, date, events: [], settings, baby, now });

  const prediction = usePrediction(client, config.billingEnabled, baby, family, now);
  const predicted =
    model.view === 'day' && dayKey === todayKey
      ? predictedLayout(prediction, model.day.window, now, baby.timezone)
      : null;
  const showsPrediction = Boolean(predicted && (predicted.sleep.length || predicted.feeds.length));
  const predictionLine = model.view === 'day' && dayKey === todayKey ? predictionText(prediction, baby.timezone) : null;
  const [compare, setCompare] = useState(false);
  const [pitching, setPitching] = useState(false);
  const comparing = (view === 'day' || view === '24h') && compare && !insightsLocked;
  const toggleCompare = () => (insightsLocked ? setPitching(true) : setCompare(!compare));
  const rolling = useRollingComparison({
    client,
    babyId: baby.id,
    baby,
    window: model.view === '24h' ? model.window : null,
    current: model.view === '24h' ? model.summary : null,
    enabled: comparing && view === '24h',
    placeholder: 'previous',
  });
  const comparison =
    useDayComparison({
      client,
      babyId: baby.id,
      baby,
      dayKey,
      todayKey,
      current: model.view === 'day' ? model.day.summary : null,
      now,
      enabled: comparing && view === 'day',
    }) ?? rolling;
  const { feedDue, night } = useTimelineMarkers({
    client,
    babyId: baby.id,
    timeZone: baby.timezone,
    model,
    now,
    lanes,
    enabled: !insightsLocked,
  });
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
          <View className="min-h-tap flex-row items-center justify-center gap-2">
            <Text className="font-semibold text-row-title text-ink">Last 24 hours</Text>
            <CompareButton
              comparing={comparing}
              label="Compare with the 24 hours before"
              locked={insightsLocked}
              plus={config.billingEnabled}
              onPress={toggleCompare}
            />
          </View>
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
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-row-title text-ink">{rangeLabel}</Text>
              {view === 'day' && (
                <CompareButton
                  comparing={comparing}
                  label={comparisonToggleLabel(dayKey, todayKey)}
                  locked={insightsLocked}
                  plus={config.billingEnabled}
                  onPress={toggleCompare}
                />
              )}
            </View>
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

        <LaneToggles show={show} onChange={setShow} />

        <PlusDialog feature={pitching ? 'insights' : null} onClose={() => setPitching(false)} />

        {sampleOnly ? (
          <PlusMask
            feature="insights"
            title="30-day timeline"
            body={`See a month of ${baby.name}'s sleep and feeds, one row a day, to spot patterns as they form.`}
          >
            <SampleMonth now={now} />
          </PlusMask>
        ) : pending ? (
          <PageSpinner />
        ) : model.view === '24h' ? (
          <>
            {!comparing && <SummaryStrip items={daySummaryStrip(model.summary)} />}
            {comparing ? (
              <ComparedTimelines
                lanes={lanes}
                night={night}
                comparison={comparison}
                currentLabel="Last 24h"
                ticks={model.ticks}
                timeZone={baby.timezone}
                units={units}
                now={now}
              >
                <DayTimeline
                  lanes={lanes}
                  night={night}
                  layout={model.layout}
                  ticks={model.ticks}
                  timeZone={baby.timezone}
                  units={units}
                  now={now}
                  nowFrac={model.nowFrac}
                  feedDue={feedDue}
                  compact
                />
              </ComparedTimelines>
            ) : (
              <DayTimeline
                lanes={lanes}
                night={night}
                layout={model.layout}
                ticks={model.ticks}
                timeZone={baby.timezone}
                units={units}
                now={now}
                nowFrac={model.nowFrac}
                feedDue={feedDue}
              />
            )}
            {comparison && (
              <DayComparisonCard comparison={comparison} currentLabel="Last 24h" plusBadge={config.billingEnabled} />
            )}
            {!comparing && <DayTotals cards={dayTotalCards(model.summary, units, baby.timezone)} />}
          </>
        ) : model.view === 'day' ? (
          <>
            {!comparing && <SummaryStrip items={daySummaryStrip(model.day.summary)} />}
            {predictionLine && <PredictionLine text={predictionLine} plus={config.billingEnabled} />}
            {comparing ? (
              <ComparedTimelines
                lanes={lanes}
                night={night}
                comparison={comparison}
                currentLabel={rangeLabel}
                ticks={model.ticks}
                timeZone={baby.timezone}
                units={units}
                now={now}
              >
                <DayTimeline
                  lanes={lanes}
                  night={night}
                  layout={model.day.layout}
                  ticks={model.ticks}
                  timeZone={baby.timezone}
                  units={units}
                  now={now}
                  nowFrac={model.nowFrac}
                  predicted={predicted}
                  feedDue={feedDue}
                  compact
                />
              </ComparedTimelines>
            ) : (
              <DayTimeline
                lanes={lanes}
                night={night}
                layout={model.day.layout}
                ticks={model.ticks}
                timeZone={baby.timezone}
                units={units}
                now={now}
                nowFrac={model.nowFrac}
                predicted={predicted}
                feedDue={feedDue}
              />
            )}
            {showsPrediction && (
              <View className="flex-row items-center gap-2">
                {config.billingEnabled && <PlusBadge />}
                <Text className="flex-1 font-sans text-caption text-ink-3">
                  Dashed blocks show likely sleeps and feeds for the next few hours.
                </Text>
              </View>
            )}
            {comparison && (
              <DayComparisonCard comparison={comparison} currentLabel={rangeLabel} plusBadge={config.billingEnabled} />
            )}
            {!comparing && <DayTotals cards={dayTotalCards(model.day.summary, units, baby.timezone)} />}
          </>
        ) : model.view === '30d' ? (
          <>
            <SummaryStrip items={weekSummaryStrip(model.week)} />
            <MonthTimeline
              lanes={lanes}
              days={model.days.map((day) => ({
                dayKey: day.dayKey,
                layout: day.layout && filterLayout(day.layout, lanes),
              }))}
              ticks={model.ticks}
              todayKey={todayKey}
              onOpenDay={openDay}
            />
          </>
        ) : (
          <>
            <SummaryStrip items={weekSummaryStrip(model.week)} />
            <WeekTimeline
              lanes={lanes}
              days={model.days.map((day) => ({
                dayKey: day.dayKey,
                layout: day.layout && filterLayout(day.layout, lanes),
              }))}
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
  const ink = useTokenColor('--ink');
  const onPrimary = useTokenColor('--ink-on-solid');
  const plusIcon = useTokenColor('--on-primary-soft');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={comparing ? 'Stop comparing' : label}
      accessibilityHint={locked && plus ? 'Part of Babble Plus' : undefined}
      accessibilityState={{ selected: comparing }}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full ${comparing ? 'bg-primary' : 'bg-surface'}`}
    >
      <ArrowLeftRight size={20} color={comparing ? onPrimary : ink} strokeWidth={2.75} />
      {locked && plus && (
        <View className="absolute -right-0.5 -top-0.5 size-4 items-center justify-center rounded-full bg-primary-soft">
          <Sparkles size={10} color={plusIcon} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

function ComparedTimelines({
  comparison,
  currentLabel,
  ticks,
  timeZone,
  units,
  now,
  lanes,
  night,
  children,
}: {
  lanes: readonly TimelineLane[];
  night: NightMarker[];
  comparison: DayComparison | null;
  currentLabel: string;
  ticks: TimelineTick[];
  timeZone: string;
  units: Units;
  now: Date;
  children: ReactNode;
}) {
  return (
    <View className="flex-row gap-3" testID="day-comparison-timelines">
      <View className="flex-1 gap-2">
        <Text className="font-semibold text-meta text-ink-2">{comparison?.previousLabel ?? '…'}</Text>
        {comparison ? (
          <DayTimeline
            lanes={lanes}
            night={night}
            layout={comparison.layout}
            ticks={ticks}
            timeZone={timeZone}
            units={units}
            now={now}
            nowFrac={comparison.cutoffFrac}
            compact
          />
        ) : (
          <PageSpinner />
        )}
      </View>
      <View className="flex-1 gap-2">
        <Text className="font-semibold text-meta text-ink">{currentLabel}</Text>
        {children}
      </View>
    </View>
  );
}
