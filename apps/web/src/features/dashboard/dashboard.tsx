import type { BabbleClient, BabyRow, Family, SavedReport } from '@babble/api';
import {
  isStatsCardKey,
  moveCard,
  PLUS_PREBUILT,
  PREBUILT_LABELS,
  removeCard,
  resizeCard,
  updateText,
  type DashboardCard,
  type DashboardLayout,
  type GrowthReport,
  type InsightsReport,
  type StatsCard,
  type StatsReport,
} from '@babble/domain';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '#/components/ui/card';
import { PlusTeaser } from '#/features/plus-teaser';
import { SavedReportCard } from '#/features/reports/saved-report-card';
import { GrowthCard } from '#/features/stats/growth-card';
import { StatsCards } from '#/features/stats/stats-cards';
import { WeeklySummaryCard } from '#/features/stats/weekly-summary';
import { cn } from '#/lib/cn';
import { TextCard } from './text-card';

export interface DashboardSources {
  stats: StatsReport | null;
  growth: GrowthReport | null;
  patterns: { locked: true } | { locked: false; report: InsightsReport } | null;
  reports: SavedReport[];
  client: BabbleClient;
  baby: BabyRow;
  family: Family;
  now: Date;
  babyName: string;
  canLog: boolean;
  plusBadges: boolean;
  linkBars: boolean;
}

function patternCard(report: InsightsReport, key: StatsCard['key']): StatsCard | null {
  return (
    [report.feeds, report.spacing, report.clusters, report.wake, report.night].find((card) => card?.key === key) ?? null
  );
}

function Placeholder({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex h-full min-h-32 flex-col justify-center gap-1 border border-dashed border-line-strong bg-transparent p-5 text-center shadow-none">
      <span className="text-row-title font-semibold text-ink-2">{label}</span>
      <span className="text-meta text-ink-3">{children}</span>
    </Card>
  );
}

function renderCard(
  card: DashboardCard,
  sources: DashboardSources,
  arranging: boolean,
  onText: (body: string) => void,
): ReactNode {
  switch (card.kind) {
    case 'text':
      return <TextCard body={card.body} editing={arranging} onChange={onText} />;
    case 'report': {
      const report = sources.reports.find((item) => item.id === card.reportId);
      if (!report) return <Placeholder label="Report removed">This saved report no longer exists.</Placeholder>;
      return (
        <SavedReportCard
          client={sources.client}
          baby={sources.baby}
          family={sources.family}
          report={report}
          now={sources.now}
          size={card.size}
        />
      );
    }
    case 'prebuilt': {
      const label = PREBUILT_LABELS[card.card];
      if (card.card === 'growth') {
        if (!sources.growth)
          return <Placeholder label={label}>Log a weight, length or head size to chart it.</Placeholder>;
        return (
          <GrowthCard
            report={sources.growth}
            babyName={sources.babyName}
            timeZone={sources.baby.timezone}
            canLog={sources.canLog}
            plusBadge={sources.plusBadges}
          />
        );
      }
      if (PLUS_PREBUILT.includes(card.card)) {
        if (!sources.patterns)
          return <Placeholder label={label}>Shows once there are two weeks of entries.</Placeholder>;
        if (sources.patterns.locked) {
          return (
            <PlusTeaser feature="insights" title={label}>
              {`${label} is part of Babble Plus.`}
            </PlusTeaser>
          );
        }
        if (card.card === 'weekly') {
          return sources.patterns.report.weekly ? (
            <WeeklySummaryCard summary={sources.patterns.report.weekly} plusBadge={sources.plusBadges} />
          ) : (
            <Placeholder label={label}>Starts once there are two weeks of entries.</Placeholder>
          );
        }
        const pattern = isStatsCardKey(card.card) ? patternCard(sources.patterns.report, card.card) : null;
        return pattern ? (
          <StatsCards cards={[pattern]} columns={1} plusBadges={sources.plusBadges} linkBars={sources.linkBars} />
        ) : (
          <Placeholder label={label}>Needs more entries in the last two weeks.</Placeholder>
        );
      }
      const stats = isStatsCardKey(card.card)
        ? (sources.stats?.cards.find((item) => item.key === card.card) ?? null)
        : null;
      return stats ? (
        <StatsCards cards={[stats]} columns={1} linkBars={sources.linkBars} />
      ) : (
        <Placeholder label={label}>Nothing logged in this range.</Placeholder>
      );
    }
  }
}

export function Dashboard({
  layout,
  sources,
  arranging,
  onChange,
  onAdd,
}: {
  layout: DashboardLayout;
  sources: DashboardSources;
  arranging: boolean;
  onChange: (layout: DashboardLayout) => void;
  onAdd: () => void;
}) {
  const shown = layout.cards.filter((card) => arranging || card.kind !== 'prebuilt' || hasContent(card, sources));
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="list" aria-label="Dashboard cards">
      {shown.map((card, index) => (
        <div
          key={card.id}
          role="listitem"
          id={card.kind === 'prebuilt' && card.card === 'growth' ? 'stats-section-growth' : undefined}
          className={cn('flex scroll-mt-6 flex-col gap-2', card.size === 'm' && 'lg:col-span-2')}
        >
          {arranging && (
            <div
              className="flex items-center gap-1 rounded-chip bg-surface px-2 py-1"
              aria-label={`Arrange ${cardLabel(card, sources)}`}
            >
              <span className="min-w-0 flex-1 truncate px-1 text-caption font-semibold text-ink-2">
                {cardLabel(card, sources)}
              </span>
              <button
                type="button"
                aria-label="Move up"
                disabled={index === 0}
                className="grid size-8 place-items-center rounded-full hover:bg-line disabled:opacity-40"
                onClick={() => onChange(moveCard(layout, card.id, -1))}
              >
                <ArrowUp className="size-4" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === shown.length - 1}
                className="grid size-8 place-items-center rounded-full hover:bg-line disabled:opacity-40"
                onClick={() => onChange(moveCard(layout, card.id, 1))}
              >
                <ArrowDown className="size-4" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                aria-label={card.size === 's' ? 'Make wide' : 'Make narrow'}
                className="h-8 rounded-full px-2 text-caption font-bold hover:bg-line"
                onClick={() => onChange(resizeCard(layout, card.id, card.size === 's' ? 'm' : 's'))}
              >
                {card.size === 's' ? 'S' : 'M'}
              </button>
              <button
                type="button"
                aria-label="Remove card"
                className="grid size-8 place-items-center rounded-full text-danger hover:bg-line"
                onClick={() => onChange(removeCard(layout, card.id))}
              >
                <Trash2 className="size-4" strokeWidth={2.75} />
              </button>
            </div>
          )}
          {renderCard(card, sources, arranging, (body) => onChange(updateText(layout, card.id, body)))}
        </div>
      ))}
      {arranging && (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-body font-semibold text-ink-2 hover:bg-surface"
        >
          <Plus className="size-5" strokeWidth={2.75} />
          Add card
        </button>
      )}
    </div>
  );
}

function cardLabel(card: DashboardCard, sources: DashboardSources): string {
  if (card.kind === 'text') return 'Note';
  if (card.kind === 'report') return sources.reports.find((item) => item.id === card.reportId)?.name ?? 'Report';
  return PREBUILT_LABELS[card.card];
}

function hasContent(card: DashboardCard & { kind: 'prebuilt' }, sources: DashboardSources): boolean {
  if (card.card === 'growth') return sources.growth !== null;
  if (PLUS_PREBUILT.includes(card.card)) {
    if (!sources.patterns) return false;
    if (sources.patterns.locked) return true;
    if (card.card === 'weekly') return sources.patterns.report.weekly !== null;
    return isStatsCardKey(card.card) && patternCard(sources.patterns.report, card.card) !== null;
  }
  return isStatsCardKey(card.card) && Boolean(sources.stats?.cards.some((item) => item.key === card.card));
}
