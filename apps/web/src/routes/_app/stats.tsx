import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import { dayKeyFor, dayWindow, growthReport, rangeDays, statsReport, type StatsRange } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { GrowthCard } from '#/features/stats/growth-card';
import { StatsCards } from '#/features/stats/stats-cards';
import { useUnits } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/stats')({
  validateSearch: (search: Record<string, unknown>): { range?: StatsRange } => ({
    range: search.range === '7d' || search.range === '30d' || search.range === 'all' ? search.range : undefined,
  }),
  component: StatsPage,
});

function StatsPage() {
  const { babble, baby } = Route.useRouteContext();
  const { range = '7d' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const now = useNow(60_000);
  const units = useUnits(babble.client, baby.id);
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const keys = rangeDays(range, todayKey, baby.birth_date);
  const from = dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes).start.toISOString();
  const to = dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery(eventsBetweenQuery(babble.client, baby.id, from, to));
  const growth = useQuery(eventListQuery(babble.client, baby.id, ['growth']));

  const report =
    events.data && settings
      ? statsReport(events.data, keys, todayKey, now, {
          timeZone: baby.timezone,
          dayStartMinutes: baby.day_start_minutes,
          nightStartMinutes: settings.night_start_minutes,
          nightEndMinutes: settings.night_end_minutes,
          mergeGapMs: settings.downtime_merge_threshold_sec * 1000,
          units,
        })
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-bold">Stats</h1>
          {report && (
            <p className="mt-1 text-meta text-ink-2">
              {report.todayOnly
                ? 'Showing today so far. Daily averages start once a full day has been logged.'
                : `Daily averages over ${report.days} finished ${report.days === 1 ? 'day' : 'days'}; today is charted but not averaged.`}
            </p>
          )}
        </div>
        <div className="w-56">
          <Segmented<StatsRange>
            label="Range"
            value={range}
            onChange={(next) => void navigate({ search: { range: next } })}
            options={[
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
      </div>
      {!report ? (
        <PageSpinner />
      ) : events.data!.length === 0 ? (
        <EmptyState icon={ChartColumn} title="Nothing to chart yet">
          Stats for sleep, feeds and nappies appear once you start logging.
        </EmptyState>
      ) : (
        <StatsCards cards={report.cards} />
      )}
      {growth.data && (growth.data.length > 0 || (events.data?.length ?? 0) > 0) && (
        <GrowthCard
          report={growthReport(
            growth.data,
            { birthDate: baby.birth_date, sex: baby.sex, timeZone: baby.timezone },
            units,
          )}
          babyName={baby.name}
          timeZone={baby.timezone}
        />
      )}
    </div>
  );
}
