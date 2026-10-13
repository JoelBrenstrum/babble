import { formatDuration } from '../format/duration';
import { fitStretches } from './sleep-stretches';
import type { SleepStretch } from './types';
import { byStartedAtAsc, compareIso, ms } from '../time/instants';
import { MINUTE_MS } from '../time/constants';

export interface ClosedStretch {
  startedAt: string;
  endedAt: string;
}

export interface AwakePeriod {
  wokeAt: string;
  asleepAt: string;
}

const DEFAULT_AWAKE_MS = 10 * MINUTE_MS;

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

const stretchMs = (stretch: ClosedStretch) => ms(stretch.endedAt) - ms(stretch.startedAt);

export function newAwakePeriod(startedAt: string, endedAt: string, periods: readonly AwakePeriod[]): AwakePeriod {
  const stretches = stretchesWithAwake(startedAt, endedAt, periods);
  const asleep = stretches.length > 0 ? stretches : [{ startedAt, endedAt }];
  const longest = asleep.reduce((best, stretch) => (stretchMs(stretch) > stretchMs(best) ? stretch : best));
  const from = ms(longest.startedAt);
  const length = stretchMs(longest);
  const awake = Math.min(DEFAULT_AWAKE_MS, Math.floor(length / 3));
  const wokeAt = Math.round((from + (length - awake) / 2) / MINUTE_MS) * MINUTE_MS;
  return { wokeAt: new Date(wokeAt).toISOString(), asleepAt: new Date(wokeAt + awake).toISOString() };
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

export function napDurationText(
  startedAt: string,
  endedAt: string | null,
  periods: readonly AwakePeriod[],
): { asleep: string; awake: string | null } | null {
  if (!endedAt) return null;
  const totalMs = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return null;
  const awakeMs = periods.reduce((sum, period) => sum + Math.max(0, ms(period.asleepAt) - ms(period.wokeAt)), 0);
  return {
    asleep: formatDuration(Math.max(0, totalMs - awakeMs), { seconds: false }),
    awake: awakeMs > 0 ? formatDuration(awakeMs, { seconds: false }) : null,
  };
}

export function trimAwakePeriod(periods: readonly AwakePeriod[], index: number, stepMs = MINUTE_MS): AwakePeriod[] {
  return periods.flatMap((period, i) => {
    if (i !== index) return [period];
    const asleepAt = Date.parse(period.asleepAt) - stepMs;
    return asleepAt <= Date.parse(period.wokeAt) ? [] : [{ ...period, asleepAt: new Date(asleepAt).toISOString() }];
  });
}
