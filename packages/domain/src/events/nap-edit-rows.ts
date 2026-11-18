import { awakePeriods, stretchesWithAwake, type ClosedStretch } from './awake-periods';
import type { SleepStretch } from './types';
import { ms } from '../time/instants';
import { MINUTE_MS } from '../time/constants';

export type NapEditRow = { kind: 'asleep' | 'awake'; durationMs: number };

const DEFAULT_AWAKE_MS = 10 * MINUTE_MS;

export function napToEditRows(startedAt: string, endedAt: string, stretches: readonly SleepStretch[]): NapEditRow[] {
  const periods = awakePeriods(stretches, startedAt, endedAt);
  if (periods.length === 0) return [{ kind: 'asleep', durationMs: Math.max(0, ms(endedAt) - ms(startedAt)) }];
  const rows: NapEditRow[] = [];
  stretchesWithAwake(startedAt, endedAt, periods).forEach((stretch, index) => {
    const period = periods[index - 1];
    if (period) rows.push({ kind: 'awake', durationMs: ms(period.asleepAt) - ms(period.wokeAt) });
    rows.push({ kind: 'asleep', durationMs: Math.max(0, ms(stretch.endedAt) - ms(stretch.startedAt)) });
  });
  return rows;
}

export function editRowsToNap(
  startedAt: string,
  rows: readonly NapEditRow[],
): { segments: ClosedStretch[]; endedAt: string } {
  const stretches: { from: number; to: number }[] = [];
  let cursor = ms(startedAt);
  for (const row of rows) {
    const duration = Math.max(0, Math.round(row.durationMs));
    if (duration === 0) continue;
    if (row.kind === 'awake') {
      if (stretches.length > 0) cursor += duration;
      continue;
    }
    const last = stretches.at(-1);
    if (last && last.to === cursor) last.to = cursor + duration;
    else stretches.push({ from: cursor, to: cursor + duration });
    cursor += duration;
  }
  const iso = (value: number) => new Date(value).toISOString();
  const endedAt = stretches.length > 0 ? iso(stretches.at(-1)!.to) : startedAt;
  const segments =
    stretches.length > 1
      ? stretches.map((stretch) => ({ startedAt: iso(stretch.from), endedAt: iso(stretch.to) }))
      : [];
  return { segments, endedAt };
}

export function addWakeUpRow(rows: readonly NapEditRow[]): NapEditRow[] {
  let longest = -1;
  rows.forEach((row, index) => {
    if (row.kind === 'asleep' && (longest < 0 || row.durationMs > rows[longest]!.durationMs)) longest = index;
  });
  const length = longest < 0 ? 0 : rows[longest]!.durationMs;
  if (length <= 0) return [...rows];
  const awake = Math.min(DEFAULT_AWAKE_MS, Math.floor(length / 3));
  const before = Math.round((length - awake) / 2 / MINUTE_MS) * MINUTE_MS;
  return [
    ...rows.slice(0, longest),
    { kind: 'asleep', durationMs: before },
    { kind: 'awake', durationMs: awake },
    { kind: 'asleep', durationMs: length - awake - before },
    ...rows.slice(longest + 1),
  ];
}

export function removeWakeUpRow(rows: readonly NapEditRow[], index: number): NapEditRow[] {
  if (rows[index]?.kind !== 'awake') return [...rows];
  const merged: NapEditRow[] = [];
  rows.forEach((row, i) => {
    const kind = i === index ? 'asleep' : row.kind;
    const last = merged.at(-1);
    if (last && last.kind === 'asleep' && kind === 'asleep') last.durationMs += row.durationMs;
    else merged.push({ kind, durationMs: row.durationMs });
  });
  return merged;
}

export function editRowTotals(rows: readonly NapEditRow[]): { asleepMs: number; awakeMs: number } {
  return rows.reduce(
    (totals, row) =>
      row.kind === 'asleep'
        ? { ...totals, asleepMs: totals.asleepMs + row.durationMs }
        : { ...totals, awakeMs: totals.awakeMs + row.durationMs },
    { asleepMs: 0, awakeMs: 0 },
  );
}

export function splitHoursMinutes(durationMs: number): { hours: number; minutes: number } {
  const totalMinutes = Math.round(durationMs / MINUTE_MS);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export function joinHoursMinutes(hours: number, minutes: number): number {
  return (hours * 60 + minutes) * MINUTE_MS;
}
