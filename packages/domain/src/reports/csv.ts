import type { Units } from '../events/types';
import { formatReportValue } from './format';
import type { ReportResult } from './report';

const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function reportCsv(result: ReportResult, units: Units): string {
  const header = ['Bucket', ...result.series.map((series) => series.label)];
  const rows = result.buckets.map((bucket, index) => [
    bucket.title,
    ...result.series.map((series) => formatReportValue(series.values[index] ?? null, series.unit, units)),
  ]);
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}
