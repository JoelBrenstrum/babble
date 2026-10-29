import { formatReportValue, type ReportResult, type Units } from '@babble/domain';

export function TableChart({ result, units }: { result: ReportResult; units: Units }) {
  return (
    <div className="max-h-80 overflow-auto rounded-tile border border-line">
      <table className="w-full text-meta">
        <thead className="sticky top-0 bg-surface text-caption text-ink-2">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              {result.spec.bucket === 'day' ? 'Day' : result.spec.bucket === 'hour' ? 'Hour' : 'Period'}
            </th>
            {result.series.map((series) => (
              <th key={series.key} scope="col" className="px-3 py-2 text-right font-semibold">
                {series.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.buckets.map((bucket, index) => (
            <tr key={bucket.key} className="border-t border-line">
              <th scope="row" className="px-3 py-1.5 text-left font-medium">
                {bucket.title}
              </th>
              {result.series.map((series) => (
                <td key={series.key} className="px-3 py-1.5 text-right tabular">
                  {formatReportValue(series.values[index] ?? null, series.unit, units)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line-strong bg-surface font-semibold">
          <tr>
            <th scope="row" className="px-3 py-2 text-left">
              {result.series.some((series) => series.perDay) ? 'Per day' : 'Overall'}
            </th>
            {result.series.map((series) => (
              <td key={series.key} className="px-3 py-2 text-right tabular">
                {formatReportValue(series.total, series.unit, units)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
