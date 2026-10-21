import {
  daySummaryStrip,
  dayTotalCards,
  type DayComparison,
  type DayLayout,
  type DaySummary,
  type FeedDueMarker,
  type NightMarker,
  type PredictedItem,
  type TimelineLane,
  type TimelineTick,
  type Units,
} from '@babble/domain';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { PageSpinner } from '@/components/page-spinner';
import { DayComparisonCard } from './day-comparison';
import { DayTimeline } from './day-timeline';
import { DayTotals, SummaryStrip } from './totals';

export function DayPanel({
  summary,
  layout,
  lanes,
  ticks,
  nowFrac,
  now,
  units,
  timeZone,
  predicted = null,
  feedDue = null,
  night,
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
  night: NightMarker[];
  currentLabel: string;
  comparison?: DayComparison | 'loading' | null;
  plusBadge?: boolean;
  before?: ReactNode;
  after?: ReactNode;
}) {
  return (
    <View className="gap-4">
      {!comparison && <SummaryStrip items={daySummaryStrip(summary)} />}
      {before}
      {comparison ? (
        <View className="flex-row gap-3" testID="day-comparison-timelines">
          <View className="flex-1 gap-2">
            <Text className="font-semibold text-meta text-ink-2">
              {comparison === 'loading' ? '…' : comparison.previousLabel}
            </Text>
            {comparison === 'loading' ? (
              <PageSpinner />
            ) : (
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
            )}
          </View>
          <View className="flex-1 gap-2">
            <Text className="font-semibold text-meta text-ink">{currentLabel}</Text>
            <DayTimeline
              lanes={lanes}
              night={night}
              layout={layout}
              ticks={ticks}
              timeZone={timeZone}
              units={units}
              now={now}
              nowFrac={nowFrac}
              predicted={predicted}
              feedDue={feedDue}
              compact
            />
          </View>
        </View>
      ) : (
        <DayTimeline
          lanes={lanes}
          night={night}
          layout={layout}
          ticks={ticks}
          timeZone={timeZone}
          units={units}
          now={now}
          nowFrac={nowFrac}
          predicted={predicted}
          feedDue={feedDue}
        />
      )}
      {after}
      {comparison && comparison !== 'loading' && (
        <DayComparisonCard comparison={comparison} currentLabel={currentLabel} plusBadge={plusBadge} />
      )}
      {!comparison && <DayTotals cards={dayTotalCards(summary, units, timeZone)} />}
    </View>
  );
}
