import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import {
  growthReport,
  isStatsRange,
  PATTERNS_CAPTION,
  STATS_RANGES,
  statsCaption,
  statsInputs,
  statsOptions,
  statsReport,
  type StatsRange,
} from '@babble/domain';
import { sampleStatsReport } from '@babble/api/fixtures';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { cn } from '#/lib/cn';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { GrowthCard } from '#/features/stats/growth-card';
import { StatsCards } from '#/features/stats/stats-cards';
import { WeeklySummaryCard } from '#/features/stats/weekly-summary';
import { PlusTeaser } from '#/features/plus-teaser';
import { PlusMask } from '#/features/plus-mask';
import { useInsights, type InsightsState } from '#/lib/use-insights';
import { useSettled, useUnits } from '@babble/api/react';
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
  const { from, to } = statsInputs(range, baby, now);
  const insights = useInsights(babble, baby, family, now);
  const sampleOnly = range === 'all' && insights.locked;
  const events = useQuery({
    ...eventsBetweenQuery(babble.client, baby.id, from, to),
    enabled: !sampleOnly,
    placeholderData: keepPreviousData,
  });
  const loading = events.isPlaceholderData && !sampleOnly;
  const shownRange = useSettled(range, !loading);
  const { todayKey, keys } = statsInputs(shownRange, baby, now);
  const growth = useQuery(eventListQuery(babble.client, baby.id, ['growth']));
  const sample = useMemo(() => (sampleOnly ? sampleStatsReport(now) : null), [sampleOnly, now]);

  const report =
    sample ??
    (events.data && settings
      ? statsReport(events.data, keys, todayKey, now, statsOptions(baby, settings, units))
      : null);

  const empty = !sample && events.data?.length === 0;
  const showGrowth = Boolean(growth.data && (growth.data.length > 0 || (events.data?.length ?? 0) > 0));
  const sections = [
    { id: 'patterns', label: 'Patterns', shown: hasPatterns(insights) },
    { id: 'daily', label: 'Daily stats', shown: true },
    { id: 'growth', label: 'Growth', shown: showGrowth },
  ].filter((section) => section.shown);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-bold">Stats</h1>
        <nav aria-label="Stats sections" className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#stats-section-${section.id}`}
              className="min-h-tap-sm inline-flex items-center rounded-full bg-surface px-4 text-label font-semibold text-ink-2 hover:bg-line hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>
      <Insights state={insights} babyName={baby.name} plusBadges={babble.config.billingEnabled} />
      <section id="stats-section-daily" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="stats-daily">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h2 id="stats-daily" className="text-heading font-bold">
              Daily stats
            </h2>
            {report && !sample && !empty && <p className="mt-1 text-meta text-ink-2">{statsCaption(report)}</p>}
          </div>
          <div className="w-full sm:w-80">
            <Segmented<StatsRange>
              label="Range"
              value={range}
              onChange={(next) =>
                void navigate({
                  search: { range: next },
                  replace: true,
                  state: (prev) => ({ ...prev, keepScroll: true }),
                })
              }
              options={STATS_RANGES}
            />
          </div>
        </div>
        {!report ? (
          <PageSpinner />
        ) : empty ? (
          <EmptyState icon={ChartColumn} title="Nothing to chart yet">
            Stats for sleep, feeds and nappies appear once you start logging.
          </EmptyState>
        ) : (
          <PlusMask
            locked={Boolean(sample)}
            feature="insights"
            title="All-time stats"
            body={`Charts and averages for every day since ${baby.name} was born are part of Babble Plus.`}
          >
            <div className={cn('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
              <StatsCards cards={report.cards} />
            </div>
          </PlusMask>
        )}
      </section>
      {showGrowth && growth.data && (
        <div id="stats-section-growth" className="scroll-mt-6">
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
        </div>
      )}
    </div>
  );
}

function hasPatterns(state: InsightsState): boolean {
  if (state.locked) return true;
  const report = state.report;
  return Boolean(report && (report.weekly || report.wake || report.night));
}

function Insights({ state, babyName, plusBadges }: { state: InsightsState; babyName: string; plusBadges: boolean }) {
  if (!hasPatterns(state)) return null;
  if (state.locked) {
    return (
      <div id="stats-section-patterns" className="scroll-mt-6">
        <PlusTeaser feature="insights" title="Patterns">
          {`See ${babyName}'s wake windows, how night sleep is stretching out, and a weekly summary of what changed.`}
        </PlusTeaser>
      </div>
    );
  }
  const report = state.report!;
  const cards = [report.wake, report.night].filter((card) => card !== null);
  return (
    <section id="stats-section-patterns" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="stats-patterns">
      <div>
        <h2 id="stats-patterns" className="text-heading font-bold">
          Patterns
        </h2>
        <p className="mt-1 text-meta text-ink-2">{PATTERNS_CAPTION}</p>
      </div>
      {report.weekly && <WeeklySummaryCard summary={report.weekly} plusBadge={plusBadges} />}
      {cards.length > 0 && <StatsCards cards={cards} plusBadges={plusBadges} />}
    </section>
  );
}
