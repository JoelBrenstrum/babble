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
import { familyHasFeature } from '@babble/config';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChartColumn, ChartSpline, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '#/lib/cn';
import { Button } from '#/components/ui/button';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { AddCardSheet } from '#/features/dashboard/add-card-sheet';
import { Dashboard, type DashboardSources } from '#/features/dashboard/dashboard';
import { StatsCards } from '#/features/stats/stats-cards';
import { WeeklySummaryCard } from '#/features/stats/weekly-summary';
import { patternCards, patternsOf, type Patterns } from '#/features/stats/patterns';
import { PlusTeaser } from '#/features/plus-teaser';
import { PlusMask } from '#/features/plus-mask';
import {
  useDashboard,
  useInsights,
  useNow,
  useReports,
  useSaveDashboard,
  useSettled,
  useUnits,
} from '@babble/api/react';
import { addCard, pruneReports } from '@babble/domain';

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
  const insights = useInsights(babble.client, babble.config.billingEnabled, baby, family, now);
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
  const dashboard = useDashboard(babble.client, family.id);
  const saveDashboard = useSaveDashboard(babble.client, family.id);
  const savedReports = useReports(babble.client, family.id).data;
  const reports = useMemo(() => savedReports ?? [], [savedReports]);
  const [arranging, setArranging] = useState(false);
  const [adding, setAdding] = useState(false);

  const report =
    sample ??
    (events.data && settings
      ? statsReport(events.data, keys, todayKey, now, statsOptions(baby, settings, units))
      : null);

  const empty = !sample && events.data?.length === 0;
  const showGrowth = Boolean(growth.data && (growth.data.length > 0 || (events.data?.length ?? 0) > 0));
  const patterns = patternsOf(insights);
  const growthData = growth.data;
  const layout = useMemo(
    () => (dashboard.data ? pruneReports(dashboard.data, new Set(reports.map((report) => report.id))) : null),
    [dashboard.data, reports],
  );
  const sources: DashboardSources | null = report
    ? {
        stats: report,
        growth:
          showGrowth && growthData
            ? growthReport(
                growthData,
                { birthDate: baby.birth_date, sex: baby.sex, timeZone: baby.timezone },
                units,
                familyHasFeature(babble.config.billingEnabled, family.plan, 'predictions') ? now : undefined,
              )
            : null,
        patterns: patterns && (patterns.locked ? patterns : { locked: false, report: patterns.report }),
        reports,
        client: babble.client,
        baby,
        family,
        now,
        babyName: baby.name,
        canLog,
        plusBadges: babble.config.billingEnabled,
        linkBars: !sample,
      }
    : null;
  const sections = [
    { id: 'daily', label: 'Dashboard', shown: true },
    {
      id: 'growth',
      label: 'Growth',
      shown: showGrowth && layout?.cards.some((card) => card.kind === 'prebuilt' && card.card === 'growth'),
    },
    { id: 'patterns', label: 'Patterns', shown: patterns !== null },
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
              className="h-10 inline-flex items-center rounded-full bg-surface px-4 text-label font-semibold text-ink-2 hover:bg-line hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>
      <section id="stats-section-daily" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="stats-daily">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h2 id="stats-daily" className="text-heading font-bold">
              Dashboard
            </h2>
            {report && !sample && !empty && (
              <p className="mt-1 text-meta text-ink-2">
                {statsCaption(report)}{' '}
                <Link
                  to="/guide"
                  hash="dashboard"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  How the dashboard works
                </Link>
              </p>
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {canLog && layout && !sample && (
              <Button
                variant={arranging ? 'primary' : 'secondary'}
                aria-pressed={arranging}
                onClick={() => setArranging((value) => !value)}
              >
                <LayoutGrid className="size-4" strokeWidth={2.75} />
                {arranging ? 'Done' : 'Arrange'}
              </Button>
            )}
            <div className="min-w-0 flex-1 sm:w-80">
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
        </div>
        <Link
          to="/reports"
          className="flex h-tap items-center gap-3 rounded-card bg-raised px-4 text-body font-medium shadow-raised hover:bg-surface"
        >
          <ChartSpline className="size-5 text-primary" strokeWidth={2.75} />
          <span className="flex-1">Reports: build your own charts</span>
          <ChevronRight className="size-5 text-ink-3" strokeWidth={2.75} />
        </Link>
        {!report || !sources || !layout ? (
          <PageSpinner />
        ) : empty && !arranging ? (
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
              <Dashboard
                layout={layout}
                sources={sources}
                arranging={arranging}
                onChange={(next) => saveDashboard.mutate(next)}
                onAdd={() => setAdding(true)}
              />
            </div>
          </PlusMask>
        )}
        {adding && layout && (
          <AddCardSheet
            layout={layout}
            reports={reports}
            plusLocked={!familyHasFeature(babble.config.billingEnabled, family.plan, 'insights')}
            onAdd={(card) => saveDashboard.mutate(addCard(layout, card))}
            onClose={() => setAdding(false)}
          />
        )}
      </section>
      {patterns && <Insights patterns={patterns} babyName={baby.name} plusBadges={babble.config.billingEnabled} />}
    </div>
  );
}

function Insights({ patterns, babyName, plusBadges }: { patterns: Patterns; babyName: string; plusBadges: boolean }) {
  if (patterns.locked) {
    return (
      <div id="stats-section-patterns" className="scroll-mt-6">
        <PlusTeaser feature="insights" title="Patterns">
          {`See ${babyName}'s wake windows, how night sleep is stretching out, how breastfeeds are changing, how far apart feeds are, when feeds bunch up into clusters, and a weekly summary of what changed.`}
        </PlusTeaser>
      </div>
    );
  }
  const { report } = patterns;
  const cards = patternCards(report);
  return (
    <section id="stats-section-patterns" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="stats-patterns">
      <div>
        <h2 id="stats-patterns" className="text-heading font-bold">
          Patterns
        </h2>
        <p className="mt-1 text-meta text-ink-2">{PATTERNS_CAPTION}</p>
      </div>
      {report.weekly && <WeeklySummaryCard summary={report.weekly} plusBadge={plusBadges} />}
      {cards.length > 0 && <StatsCards cards={cards} plusBadges={plusBadges} linkBars />}
    </section>
  );
}
