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
  type TimelineModel,
  type TimelineTick,
  type TotalCard,
  type Units,
} from '@babble/domain';
import type { ReactNode } from 'react';
import { SectionSpinner } from '#/components/ui/spinner';
import { DayComparisonCard } from './day-comparison';
import { DayTimeline } from './day-timeline';
import { DayTotals, SummaryStrip } from './totals';

export interface DayPanelView {
  summary: DaySummary;
  layout: DayLayout;
  ticks: TimelineTick[];
  nowFrac: number | null;
}

export interface DayMarkers {
  feedDue: FeedDueMarker | null;
  night: NightMarker[];
}

export type DayModel = Extract<TimelineModel, { view: 'day' | '24h' }>;

export const isDayModel = (model: TimelineModel): model is DayModel => model.view === 'day' || model.view === '24h';

export function dayPanelView(model: DayModel): DayPanelView {
  const { summary, layout } = model.view === 'day' ? model.day : model;
  return { summary, layout, ticks: model.ticks, nowFrac: model.nowFrac };
}

export function DayPanel({
  view,
  markers,
  lanes,
  now,
  units,
  timeZone,
  predicted = null,
  rhythm = [],
  currentLabel,
  comparison = null,
  plusBadge = false,
  before,
  after,
}: {
  view: DayPanelView;
  markers: DayMarkers;
  lanes: readonly TimelineLane[];
  now: Date;
  units: Units;
  timeZone: string;
  predicted?: { sleep: PredictedItem[]; feeds: PredictedItem[] } | null;
  rhythm?: TotalCard[];
  currentLabel?: string;
  comparison?: DayComparison | 'loading' | null;
  plusBadge?: boolean;
  before?: ReactNode;
  after?: ReactNode;
}) {
  const { summary, layout, ticks, nowFrac } = view;
  const { feedDue, night } = markers;
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
                <SectionSpinner label="Loading comparison" />
              ) : (
                <DayTimeline
                  layout={comparison.layout}
                  lanes={lanes}
                  night={night}
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
                night={night}
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
            night={night}
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
        {!comparison && <DayTotals cards={[...dayTotalCards(summary, units, timeZone), ...rhythm]} />}
      </div>
    </div>
  );
}
