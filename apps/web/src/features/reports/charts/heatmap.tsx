import { formatReportValue, heatIntensity, type ReportResult, type Units } from '@babble/domain';
import { useState } from 'react';
import { ChartTip } from '#/components/ui/chart-tip';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';

const HOUR_MARKS = [0, 6, 12, 18];

export function HeatmapChart({ result, units, rows: limit }: { result: ReportResult; units: Units; rows?: number }) {
  const grid =
    result.grid && limit
      ? { ...result.grid, rows: result.grid.rows.slice(-limit), values: result.grid.values.slice(-limit) }
      : result.grid;
  const series = result.series[0];
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  if (!grid || !series) return null;
  const look = toneLook(series.tone);
  const rows = grid.rows.length;
  const shown = active ? grid.values[active.row]?.[active.col] : undefined;
  return (
    <div className="relative flex flex-col gap-1">
      <div className="relative ml-12 h-4 text-caption text-ink-3">
        {HOUR_MARKS.map((hour) => (
          <span key={hour} className="absolute whitespace-nowrap" style={{ left: `${(hour / 24) * 100}%` }}>
            {grid.cols[hour]}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-px" role="img" aria-label={`${series.label} by hour of day, one row per day`}>
        {grid.rows.map((row, rowIndex) => (
          <div key={row.key} className="flex items-center gap-1">
            <span className="w-11 shrink-0 truncate text-caption tabular text-ink-3">
              {rowIndex === 0 || rowIndex === rows - 1 || rowIndex % 7 === 0 ? row.title.replace(/^\w+ /, '') : ''}
            </span>
            <div className="grid flex-1 grid-cols-24 gap-px">
              {grid.values[rowIndex]!.map((value, col) => (
                <span
                  key={col}
                  className={cn(
                    'h-3 rounded-[2px]',
                    value > 0 ? look.classes.bg : 'bg-surface',
                    active?.row === rowIndex && active.col === col && 'ring-1 ring-ink',
                  )}
                  style={value > 0 ? { opacity: heatIntensity(value, grid.max) * look.opacity } : undefined}
                  onMouseEnter={() => setActive({ row: rowIndex, col })}
                  onMouseLeave={() => setActive(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {active && shown !== undefined && (
        <ChartTip className="bottom-full left-1/2 mb-2 -translate-x-1/2">
          {`${grid.rows[active.row]!.title}, ${grid.cols[active.col]}: ${formatReportValue(shown, series.unit, units)}`}
        </ChartTip>
      )}
    </div>
  );
}
