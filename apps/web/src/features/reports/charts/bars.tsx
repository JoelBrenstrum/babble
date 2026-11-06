import { bucketReadout, nextBarIndex, type ReportResult, type Units } from '@babble/domain';
import { useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';
import { ReadoutTip, type ChartProps } from './shared';

export function BarsChart({ result, units, active, onActive }: { result: ReportResult; units: Units } & ChartProps) {
  const count = result.buckets.length;
  const stacked = result.spec.options.stack !== false;
  const [focusIndex, setFocusIndex] = useState(count - 1);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const tabStop = Math.min(focusIndex, count - 1);
  const max = result.max > 0 ? result.max : 1;

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = nextBarIndex(event.key, index, count);
    if (target === null) return;
    event.preventDefault();
    setFocusIndex(target);
    bars.current[target]?.focus();
  };

  return (
    <div className="relative flex h-32 items-end gap-[3px] border-b border-line">
      {result.buckets.map((bucket, index) => {
        const readout = bucketReadout(result, index, units).join(' · ');
        const values = result.series.map((series) => series.values[index] ?? 0);
        const total = values.reduce((sum, value) => sum + value, 0);
        const previous = result.compare
          ? Math.max(0, ...result.compare.series.map((series) => series.values[index] ?? 0))
          : 0;
        return (
          <div
            key={bucket.key}
            ref={(element) => {
              bars.current[index] = element;
            }}
            role="img"
            aria-label={readout}
            tabIndex={index === tabStop ? 0 : -1}
            className={cn(
              'relative flex h-full min-w-0 flex-1 items-end rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
              stacked ? 'flex-col-reverse' : 'gap-px',
              active === index && 'opacity-80',
            )}
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => {
              onActive(index);
              setFocusIndex(index);
            }}
            onBlur={() => onActive(null)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {previous > 0 && (
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 rounded-t-sm border border-dashed border-ink-3/60"
                style={{ height: `${(previous / max) * 100}%` }}
              />
            )}
            {result.series.map((series, order) => {
              const look = toneLook(series.tone);
              const value = Math.max(0, values[order] ?? 0);
              return (
                <div
                  key={series.key}
                  className={cn(
                    look.classes.bg,
                    stacked ? 'w-full' : 'min-w-0 flex-1 rounded-t-sm',
                    stacked && 'first:rounded-t-none',
                  )}
                  style={{ height: `${(value / max) * 100}%`, ...look.style }}
                />
              );
            })}
            {total === 0 && previous === 0 && <div className="absolute inset-x-0 bottom-0 h-px bg-line" />}
          </div>
        );
      })}
      {active !== null && result.buckets[active] && (
        <ReadoutTip lines={bucketReadout(result, active, units)} index={active} count={count} />
      )}
    </div>
  );
}
