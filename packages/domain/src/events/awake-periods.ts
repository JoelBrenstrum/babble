import { formatDuration } from '../format/duration';
import { fitStretches } from './sleep-stretches';
import type { SleepStretch } from './types';

export interface AwakePeriod {
  wokeAt: string;
  asleepAt: string;
}

const DEFAULT_AWAKE_MS = 10 * 60_000;

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
): SleepStretch[] {
  if (periods.length === 0) return [];
  const ordered = [...periods].sort((a, b) => Date.parse(a.wokeAt) - Date.parse(b.wokeAt));
  return [
    { startedAt, endedAt: ordered[0]!.wokeAt },
    ...ordered.map((period, index) => ({
      startedAt: period.asleepAt,
      endedAt: ordered[index + 1]?.wokeAt ?? endedAt,
    })),
  ];
}

export function newAwakePeriod(startedAt: string, endedAt: string, periods: readonly AwakePeriod[]): AwakePeriod {
  const stretches = stretchesWithAwake(startedAt, endedAt, periods);
  const asleep = stretches.length > 0 ? stretches : [{ startedAt, endedAt }];
  const longest = asleep.reduce((best, stretch) =>
    Date.parse(stretch.endedAt!) - Date.parse(stretch.startedAt) >
    Date.parse(best.endedAt!) - Date.parse(best.startedAt)
      ? stretch
      : best,
  );
  const from = Date.parse(longest.startedAt);
  const length = Date.parse(longest.endedAt!) - from;
  const awake = Math.min(DEFAULT_AWAKE_MS, Math.floor(length / 3));
  const wokeAt = Math.round((from + (length - awake) / 2) / 60_000) * 60_000;
  return { wokeAt: new Date(wokeAt).toISOString(), asleepAt: new Date(wokeAt + awake).toISOString() };
}

export function stretchesError(stretches: readonly SleepStretch[], startedAt: string, endedAt: string): string | null {
  if (stretches.length === 0) return null;
  const ordered = [...stretches].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const valid = ordered.every((stretch, index) => {
    const from = Date.parse(stretch.startedAt);
    const to = stretch.endedAt ? Date.parse(stretch.endedAt) : Number.NaN;
    const previousEnd = index > 0 ? Date.parse(ordered[index - 1]!.endedAt ?? '') : Number.NEGATIVE_INFINITY;
    return to > from && from >= previousEnd;
  });
  if (!valid) return 'Check the wake-up times.';
  if (Date.parse(ordered[0]!.endedAt!) <= Date.parse(startedAt)) return 'Wake-ups must be after the nap started.';
  if (Date.parse(ordered.at(-1)!.startedAt) >= Date.parse(endedAt)) return 'Wake-ups must be before the nap ended.';
  return null;
}

export function napDurationText(
  startedAt: string,
  endedAt: string | null,
  periods: readonly AwakePeriod[],
): { asleep: string; awake: string | null } | null {
  if (!endedAt) return null;
  const totalMs = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return null;
  const awakeMs = periods.reduce(
    (sum, period) => sum + Math.max(0, Date.parse(period.asleepAt) - Date.parse(period.wokeAt)),
    0,
  );
  return {
    asleep: formatDuration(Math.max(0, totalMs - awakeMs), { seconds: false }),
    awake: awakeMs > 0 ? formatDuration(awakeMs, { seconds: false }) : null,
  };
}

export function trimAwakePeriod(periods: readonly AwakePeriod[], index: number, stepMs = 60_000): AwakePeriod[] {
  return periods.flatMap((period, i) => {
    if (i !== index) return [period];
    const asleepAt = Date.parse(period.asleepAt) - stepMs;
    return asleepAt <= Date.parse(period.wokeAt) ? [] : [{ ...period, asleepAt: new Date(asleepAt).toISOString() }];
  });
}
