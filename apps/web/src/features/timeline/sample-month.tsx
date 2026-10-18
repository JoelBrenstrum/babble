import { sampleMonthView } from '@babble/api/fixtures';
import { weekSummaryStrip } from '@babble/domain';
import { useMemo } from 'react';
import { MonthTimeline } from './month-timeline';
import { SummaryStrip } from './totals';

export function SampleMonth({ now }: { now: Date }) {
  const sample = useMemo(() => sampleMonthView(now), [now]);
  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip items={weekSummaryStrip(sample.week)} />
      <MonthTimeline days={sample.days} ticks={sample.ticks} todayKey={sample.todayKey} linkDays={false} />
    </div>
  );
}
