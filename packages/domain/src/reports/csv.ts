import type { Units } from '../events/types';
import { formatReportValue } from './format';
import type { ReportResult } from './report';

const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const csvText = (value: string) => cell(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

export function reportCsv(result: ReportResult, units: Units): string {
  const header = ['Bucket', ...result.series.map((series) => csvText(series.label))];
  const rows = result.buckets.map((bucket, index) => [
    csvText(bucket.title),
    ...result.series.map((series) => cell(formatReportValue(series.values[index] ?? null, series.unit, units))),
  ]);
  return [header, ...rows].map((row) => row.join(',')).join('\n');
}
