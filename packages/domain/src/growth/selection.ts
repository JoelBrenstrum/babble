import {
  growthEstimateReadout,
  growthMilestoneText,
  growthPointReadout,
  type ChartPoint,
  type GrowthChart,
} from './growth';

export type MilestoneKey = `milestone-${number}`;
export type GrowthPointKey = number | 'estimate' | MilestoneKey;

const MILESTONE_PREFIX = 'milestone-';

export function milestoneKey(index: number): MilestoneKey {
  return `${MILESTONE_PREFIX}${index}`;
}

export function milestoneIndex(key: GrowthPointKey | null): number | null {
  if (typeof key !== 'string' || !key.startsWith(MILESTONE_PREFIX)) return null;
  const index = Number(key.slice(MILESTONE_PREFIX.length));
  return Number.isInteger(index) ? index : null;
}

export function growthReadout(
  chart: GrowthChart,
  key: GrowthPointKey | null,
  timeZone: string,
): { point: ChartPoint; text: string } | null {
  if (key === 'estimate')
    return chart.estimate ? { point: chart.estimate, text: growthEstimateReadout(chart.estimate) } : null;
  const milestone = milestoneIndex(key);
  if (milestone !== null) {
    const point = chart.milestones[milestone];
    return point ? { point, text: growthMilestoneText(point) } : null;
  }
  if (typeof key !== 'number') return null;
  const point = chart.points[key];
  return point ? { point, text: growthPointReadout(point, timeZone) } : null;
}
