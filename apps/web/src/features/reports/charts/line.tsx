import { bucketReadout, lineGeometry, nextBarIndex, REPORT_PAD, type ReportResult, type Units } from '@babble/domain';
import { useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';
import { ReadoutTip, type ChartProps } from './shared';

const SIZE = { width: 320, height: 128, pad: REPORT_PAD };

export function LineChart({
  result,
  units,
  area,
  active,
  onActive,
}: { result: ReportResult; units: Units; area: boolean } & ChartProps) {
  const stacked = area && result.spec.options.stack !== false && result.series.length > 1;
  const geometry = lineGeometry(result, SIZE, stacked);
  const count = result.buckets.length;
  const slot = count > 0 ? SIZE.width / count : SIZE.width;
  const [focusIndex, setFocusIndex] = useState(count - 1);
  const targets = useRef<(SVGRectElement | null)[]>([]);
  const tabStop = Math.min(focusIndex, count - 1);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = nextBarIndex(event.key, index, count);
    if (target === null) return;
    event.preventDefault();
    setFocusIndex(target);
    targets.current[target]?.focus();
  };

  return (
    <div className="relative border-b border-line">
      <svg
        viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
        preserveAspectRatio="none"
        className="block h-32 w-full"
        role="img"
        aria-label={`${result.series.map((series) => series.label).join(', ')} over time`}
      >
        {geometry.yTicks.map((tick) => (
          <line
            key={tick.label}
            x1={0}
            x2={SIZE.width}
            y1={tick.y}
            y2={tick.y}
            className="stroke-line"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}
        {geometry.compare.map((item) => (
          <path
            key={item.key}
            d={item.path}
            fill="none"
            className="stroke-ink-3/60"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[...geometry.series].reverse().map((item) => {
          const look = toneLook(item.tone);
          return (
            <g key={item.key} style={look.style}>
              {area && item.areaPath && <path d={item.areaPath} className={cn(look.classes.fill, 'opacity-35')} />}
              <path
                d={item.path}
                fill="none"
                className={look.classes.stroke}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {item.averagePath && (
                <path
                  d={item.averagePath}
                  fill="none"
                  className="stroke-ink"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}
        {result.buckets.map((bucket, index) => (
          <rect
            key={bucket.key}
            ref={(element) => {
              targets.current[index] = element;
            }}
            x={geometry.xAt(index) - slot / 2}
            y={0}
            width={slot}
            height={SIZE.height}
            fill="transparent"
            role="img"
            tabIndex={index === tabStop ? 0 : -1}
            aria-label={bucketReadout(result, index, units).join(' · ')}
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => {
              onActive(index);
              setFocusIndex(index);
            }}
            onBlur={() => onActive(null)}
            onKeyDown={(event) => onKeyDown(event, index)}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="outline-none focus-visible:stroke-primary"
          />
        ))}
      </svg>
      {active !== null &&
        geometry.series.map((item) =>
          item.points
            .filter((point) => point.index === active)
            .map((point) => (
              <span
                key={`${item.key}-${point.index}`}
                aria-hidden
                className={cn(
                  'pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current bg-raised',
                  toneLook(item.tone).classes.text,
                )}
                style={{
                  left: `${(point.x / SIZE.width) * 100}%`,
                  top: `${(point.y / SIZE.height) * 100}%`,
                  ...toneLook(item.tone).style,
                }}
              />
            )),
        )}
      {active !== null && result.buckets[active] && (
        <ReadoutTip lines={bucketReadout(result, active, units)} index={active} count={count} />
      )}
    </div>
  );
}
