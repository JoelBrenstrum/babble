import { sampleBaby, sampleEvents, sampleRunningSleep } from '@babble/api/fixtures';
import {
  dayKeyFor,
  dayLayout,
  dayTotalCards,
  dayWindow,
  fractionOf,
  hourTicks,
  summariseDay,
  summariseWeek,
  lastDays,
  weekTableRows,
} from '@babble/domain';
import { FixtureRouter } from '#/fixtures/router';
import { DayTimeline } from './day-timeline';
import { DayTotals, WeekTable } from './totals';
import { WeekTimeline } from './week-timeline';

const now = new Date();
const events = [...sampleEvents(now), sampleRunningSleep(now)];
const { timezone } = sampleBaby;
const todayKey = dayKeyFor(now.toISOString(), timezone, 0);
const window = dayWindow(todayKey, timezone, 0);
const layout = dayLayout(events, window, now);
const summary = summariseDay(events, window, {
  now,
  night: { dayKey: todayKey, timeZone: timezone, startMinutes: 19 * 60, endMinutes: 7 * 60 },
});
const keys = lastDays(todayKey, 7);
const week = keys.map((key) =>
  key === todayKey ? summary : key < todayKey ? summariseDay([], dayWindow(key, timezone, 0)) : null,
);

export default {
  Day: (
    <FixtureRouter>
      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DayTimeline
          layout={layout}
          ticks={hourTicks(todayKey, timezone, 0, 3)}
          timeZone={timezone}
          units="metric"
          nowFrac={fractionOf(window, now.getTime())}
        />
        <DayTotals cards={dayTotalCards(summary, 'metric', timezone)} />
      </div>
    </FixtureRouter>
  ),
  Week: (
    <FixtureRouter>
      <div className="flex flex-col gap-4 p-4">
        <WeekTimeline
          days={keys.map((key) => ({
            dayKey: key,
            layout: key === todayKey ? layout : key < todayKey ? dayLayout([], dayWindow(key, timezone, 0), now) : null,
          }))}
          ticks={hourTicks(keys[0]!, timezone, 0, 6)}
          todayKey={todayKey}
        />
        <WeekTable
          dayKeys={keys}
          rows={weekTableRows(week, summariseWeek(week.filter((day) => day !== null)), 'metric')}
        />
      </div>
    </FixtureRouter>
  ),
};
