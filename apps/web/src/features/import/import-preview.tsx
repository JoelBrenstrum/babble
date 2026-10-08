import { formatShortDate, summariseImport, trackerFor, type HuckleberryImport } from '@babble/domain';
import { Card } from '#/components/ui/card';
import { TrackerIcon } from '#/components/ui/tracker-icon';

export function ImportPreview({ result, timeZone }: { result: HuckleberryImport; timeZone: string }) {
  const summary = summariseImport(result);
  const types = Object.entries(summary.byType) as [keyof typeof summary.byType, number][];

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <p className="text-heading font-bold">
          {summary.total} {summary.total === 1 ? 'entry' : 'entries'} ready to import
        </p>
        {summary.firstAt && summary.lastAt && (
          <p className="mt-1 text-meta text-ink-2">
            {formatShortDate(summary.firstAt, timeZone)} – {formatShortDate(summary.lastAt, timeZone)}
          </p>
        )}
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {types.map(([type, count]) => (
            <li key={type} className="flex items-center gap-3">
              <TrackerIcon tracker={trackerFor(type)} />
              <span>
                <span className="block text-row-title font-semibold">{count}</span>
                <span className="block text-meta text-ink-2">{trackerFor(type).pluralLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {result.events.some((event) => event.type === 'breast_feed') && (
        <p className="rounded-tile bg-info-soft px-4 py-3 text-meta text-on-info">
          <strong>No downtime data for feeds.</strong> Huckleberry only keeps each side's total, so imported feeds show
          side totals without downtime or side order.
        </p>
      )}
      <p className="rounded-tile bg-surface px-4 py-3 text-meta text-ink-2">
        <strong className="text-ink">Safe to re-import.</strong> If you import a newer export later, only entries that
        aren't already in babble are added.
      </p>

      {result.skipped.length > 0 && (
        <details className="rounded-card border border-line bg-raised p-4">
          <summary className="cursor-pointer text-body font-semibold">
            {result.skipped.length} {result.skipped.length === 1 ? 'row' : 'rows'} skipped
          </summary>
          <table className="mt-3 w-full text-left text-meta">
            <thead className="text-ink-3">
              <tr>
                <th className="py-1 pr-3 font-semibold">Row</th>
                <th className="py-1 pr-3 font-semibold">Type</th>
                <th className="py-1 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody>
              {result.skipped.map((row) => (
                <tr key={row.line} className="border-t border-line">
                  <td className="tabular py-1 pr-3">{row.line}</td>
                  <td className="py-1 pr-3">{row.type}</td>
                  <td className="py-1 text-ink-2">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {result.warnings.length > 0 && (
        <details className="rounded-card border border-line bg-raised p-4">
          <summary className="cursor-pointer text-body font-semibold">
            {result.warnings.length} {result.warnings.length === 1 ? 'note' : 'notes'} about the data
          </summary>
          <ul className="mt-3 flex flex-col gap-1 text-meta text-ink-2">
            {result.warnings.map((warning, index) => (
              <li key={index}>
                Row {warning.line}: {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
