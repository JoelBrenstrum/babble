import { fitStretches } from './sleep-stretches';
import type { SleepStretch } from './types';
import { byStartedAtAsc, compareIso, ms } from '../time/instants';

export interface ClosedStretch {
  startedAt: string;
  endedAt: string;
}

export interface AwakePeriod {
  wokeAt: string;
  asleepAt: string;
}

export function awakePeriods(stretches: readonly SleepStretch[], startedAt: string, endedAt: string): AwakePeriod[] {
  const fitted = fitStretches(stretches, startedAt, endedAt);
  return fitted.slice(1).flatMap((stretch, index) => {
    const wokeAt = fitted[index]!.endedAt;
    return wokeAt && Date.parse(stretch.startedAt) > Date.parse(wokeAt)
      ? [{ wokeAt, asleepAt: stretch.startedAt }]
      : [];
  });
}

export function stretchesWithAwake(
  startedAt: string,
  endedAt: string,
  periods: readonly AwakePeriod[],
): ClosedStretch[] {
  if (periods.length === 0) return [];
  const ordered = [...periods].sort((a, b) => compareIso(a.wokeAt, b.wokeAt));
  return [
    { startedAt, endedAt: ordered[0]!.wokeAt },
    ...ordered.map((period, index) => ({
      startedAt: period.asleepAt,
      endedAt: ordered[index + 1]?.wokeAt ?? endedAt,
    })),
  ];
}

export function stretchesError(stretches: readonly SleepStretch[], startedAt: string, endedAt: string): string | null {
  if (stretches.length === 0) return null;
  const spans: { from: number; to: number }[] = [];
  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const stretch of [...stretches].sort(byStartedAtAsc)) {
    const from = ms(stretch.startedAt);
    const to = stretch.endedAt === null ? Number.NaN : ms(stretch.endedAt);
    if (!(to > from && from >= previousEnd)) return 'Check the wake-up times.';
    spans.push({ from, to });
    previousEnd = to;
  }
  if (spans[0]!.to <= ms(startedAt)) return 'Wake-ups must be after the nap started.';
  if (spans.at(-1)!.from >= ms(endedAt)) return 'Wake-ups must be before the nap ended.';
  return null;
}
