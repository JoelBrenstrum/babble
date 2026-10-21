import { sampleBaby, sampleMonthEvents } from '@babble/api/fixtures';
import { dayKeyFor, dayRhythm, dayRhythmCards, insightsReport, shiftDay, timelineModel } from '@babble/domain';
import { FixtureRouter } from '#/fixtures/router';
import { StatsCards } from '#/features/stats/stats-cards';
import { DayPanel, dayPanelView, isDayModel } from './day-panel';

const now = new Date();
const events = sampleMonthEvents(now);
const settings = { night_start_minutes: 19 * 60, night_end_minutes: 7 * 60, downtime_merge_threshold_sec: 15 };
const todayKey = dayKeyFor(now.toISOString(), sampleBaby.timezone, sampleBaby.day_start_minutes);

function RhythmDay({ dayKey }: { dayKey: string }) {
  const model = timelineModel({ view: 'day', date: dayKey, events, settings, baby: sampleBaby, now });
  if (!isDayModel(model)) return null;
  const rhythm = dayRhythm({ events, dayKey, now, settings, baby: sampleBaby });
  return (
    <FixtureRouter>
      <div className="p-4">
        <DayPanel
          view={dayPanelView(model)}
          markers={{ feedDue: null, night: [] }}
          lanes={['sleep', 'feeds', 'nappies', 'pumps']}
          now={now}
          units="metric"
          timeZone={sampleBaby.timezone}
          rhythm={dayRhythmCards(rhythm, dayKey === todayKey)}
        />
      </div>
    </FixtureRouter>
  );
}

export default {
  Today: <RhythmDay dayKey={todayKey} />,
  Yesterday: <RhythmDay dayKey={shiftDay(todayKey, -1)} />,
  'Insight charts': (
    <div className="p-4">
      <StatsCards
        cards={Object.values(
          insightsReport(events, todayKey, now, {
            timeZone: sampleBaby.timezone,
            dayStartMinutes: sampleBaby.day_start_minutes,
            nightStartMinutes: 19 * 60,
            nightEndMinutes: 7 * 60,
            mergeGapMs: 15_000,
          }),
        ).filter((card) => card !== null && 'chart' in card)}
      />
    </div>
  ),
};
