import type { Units } from '../events/types';
import { formatDuration } from '../format/duration';
import { formatLength, formatVolume, formatWeight, formatWeightChange } from '../format/units';
import { HOUR_MS, MINUTE_MS } from '../time/constants';
import type { ReportUnit } from './measures';

export function formatReportValue(value: number | null, unit: ReportUnit, units: Units): string {
  if (value === null || Number.isNaN(value)) return '—';
  switch (unit) {
    case 'h':
    case 'min':
      return formatDuration(Math.round(value / MINUTE_MS) * MINUTE_MS, { seconds: false });
    case 'ml':
      return formatVolume(value, units);
    case 'g':
      return value < 0 ? formatWeightChange(value, units) : formatWeight(value, units);
    case 'mm':
      return formatLength(value, units);
    case 'count': {
      const rounded = Math.round(value * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }
  }
}

export function axisValue(value: number, unit: ReportUnit, units: Units): string {
  if (unit === 'h')
    return value >= HOUR_MS ? `${Math.round((value / HOUR_MS) * 10) / 10}h` : `${Math.round(value / MINUTE_MS)}m`;
  if (unit === 'min') return `${Math.round(value / MINUTE_MS)}m`;
  return formatReportValue(value, unit, units);
}

export function formatDelta(
  current: number | null,
  previous: number | null,
  unit: ReportUnit,
  units: Units,
): string | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 1e-9) return 'No change';
  const sign = delta > 0 ? 'Up' : 'Down';
  return `${sign} ${formatReportValue(Math.abs(delta), unit, units)}`;
}
