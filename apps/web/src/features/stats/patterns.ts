import type { InsightsState } from '@babble/api/react';
import type { InsightsReport, StatsCard } from '@babble/domain';

export type Patterns = { locked: true } | { locked: false; report: InsightsReport };

export function patternsOf(state: InsightsState): Patterns | null {
  if (state.locked) return state;
  const { report } = state;
  if (!report) return null;
  return report.weekly || patternCards(report).length > 0 ? { locked: false, report } : null;
}

export function patternCards(report: InsightsReport): StatsCard[] {
  return [report.feeds, report.spacing, report.clusters, report.wake, report.night].filter((card) => card !== null);
}
