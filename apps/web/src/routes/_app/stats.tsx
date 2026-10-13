import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import {
  growthReport,
  isStatsRange,
  STATS_RANGES,
  statsCaption,
  statsInputs,
  statsOptions,
  statsReport,
  type StatsRange,
} from '@babble/domain';
import { sampleStatsReport } from '@babble/api/fixtures';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { GrowthCard } from '#/features/stats/growth-card';
import { StatsCards } from '#/features/stats/stats-cards';
import { WeeklySummaryCard } from '#/features/stats/weekly-summary';
import { PlusTeaser } from '#/features/plus-teaser';
import { PlusMask } from '#/features/plus-mask';
import { useInsights, type InsightsState } from '#/lib/use-insights';
import { useUnits } from '@babble/api/react';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/stats')({
  validateSearch: (search: Record<string, unknown>): { range?: StatsRange } => ({
    range: isStatsRange(search.range) ? search.range : undefined,
  }),
  component: StatsPage,
});

function StatsPage() {
  const { babble, baby, family, canLog } = Route.useRouteContext();
  const { range = '7d' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const now = useNow(60_000);
  const units = useUnits(babble.client, baby.id);
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const { todayKey, keys, from, to } = statsInputs(range, baby, now);
  const insights = useInsights(babble, baby, family, now);
  const sampleOnly = range === 'all' && insights.locked;
  const events = useQuery({ ...eventsBetweenQuery(babble.client, baby.id, from, to), enabled: !sampleOnly });
  const growth = useQuery(eventListQuery(babble.client, baby.id, ['growth']));
  const sample = useMemo(() => (sampleOnly ? sampleStatsReport(now) : null), [sampleOnly, now]);

  const report =
    sample ??
    (events.data && settings
      ? statsReport(events.data, keys, todayKey, now, statsOptions(baby, settings, units))
      : null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-bold">Stats</h1>
          {report && !sample && <p className="mt-1 text-meta text-ink-2">{statsCaption(report)}</p>}
        </div>
        <div className="w-full sm:w-80">
          <Segmented<StatsRange>
            label="Range"
            value={range}
            onChange={(next) => void navigate({ search: { range: next } })}
            options={STATS_RANGES}
          />
        </div>
      </div>
      {!report ? (
        <PageSpinner />
      ) : !sample && events.data!.length === 0 ? (
        <EmptyState icon={ChartColumn} title="Nothing to chart yet">
          Stats for sleep, feeds and nappies appear once you start logging.
        </EmptyState>
      ) : (
        <>
          <Insights state={insights} babyName={baby.name} plusBadges={babble.config.billingEnabled} />
          <PlusMask
            locked={Boolean(sample)}
            feature="insights"
            title="All-time stats"
            body={`Charts and averages for every day since ${baby.name} was born are part of Babble Plus.`}
          >
            <StatsCards cards={report.cards} />
          </PlusMask>
        </>
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
          canLog={canLog}
        />
      )}
    </div>
  );
}

function Insights({ state, babyName, plusBadges }: { state: InsightsState; babyName: string; plusBadges: boolean }) {
  if (state.locked) {
    return (
      <PlusTeaser feature="insights" title="Patterns">
        {`See ${babyName}'s wake windows, how night sleep is stretching out, and a weekly summary of what changed.`}
      </PlusTeaser>
    );
  }
  const { report } = state;
  if (!report) return null;
  const cards = [report.wake, report.night].filter((card) => card !== null);
  if (!report.weekly && cards.length === 0) return null;
  return (
    <section className="flex flex-col gap-4" aria-label="Patterns">
      {report.weekly && <WeeklySummaryCard summary={report.weekly} plusBadge={plusBadges} />}
      {cards.length > 0 && <StatsCards cards={cards} plusBadges={plusBadges} />}
    </section>
  );
}
