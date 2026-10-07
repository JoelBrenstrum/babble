import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { dayKeyFor, growthReport, lastDays, statsReport, type BabyEvent, type StatsSettings } from '@babble/domain';
import { FixtureRouter } from '#/fixtures/router';
import { GrowthCard } from './growth-card';
import { StatsCards } from './stats-cards';

const now = new Date();
const todayKey = dayKeyFor(now.toISOString(), sampleBaby.timezone, 0);
const settings: StatsSettings = {
  timeZone: sampleBaby.timezone,
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  mergeGapMs: 15_000,
  units: 'metric',
};
const report = statsReport(sampleEvents(now), lastDays(todayKey, 7), todayKey, now, settings);

const measure = (id: string, startedAt: string, weightG: number, lengthMm: number, headCircumferenceMm: number) =>
  ({
    ...sampleEvents(now)[0]!,
    id,
    type: 'growth',
    startedAt,
    endedAt: null,
    details: { weightG, lengthMm, headCircumferenceMm },
  }) as BabyEvent;
const growth = [
  measure('g1', '2026-09-26T09:00:00Z', 3300, 500, 345),
  measure('g2', '2026-10-10T09:00:00Z', 3650, 520, 355),
  measure('g3', '2026-10-26T09:00:00Z', 4300, 545, 368),
];
const growthBaby = { birthDate: sampleBaby.birth_date, timeZone: sampleBaby.timezone };

export default {
  Growth: (
    <FixtureRouter>
      <div className="p-4">
        <GrowthCard
          report={growthReport(growth, { ...growthBaby, sex: 'female' }, 'metric')}
          babyName="Olivia"
          timeZone={sampleBaby.timezone}
        />
      </div>
    </FixtureRouter>
  ),
  'Growth without sex': (
    <FixtureRouter>
      <div className="p-4">
        <GrowthCard
          report={growthReport(growth, { ...growthBaby, sex: null }, 'metric')}
          babyName="Olivia"
          timeZone={sampleBaby.timezone}
        />
      </div>
    </FixtureRouter>
  ),
  Cards: (
    <div className="p-4">
      <StatsCards cards={report.cards} />
    </div>
  ),
};
