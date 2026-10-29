import { bucketReadout, lineGeometry, REPORT_PAD, type ReportResult, type Units } from '@babble/domain';
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
  return (
    <div className="relative border-b border-line">
      <svg
        viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
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
              {item.points
                .filter((point) => point.index === active)
                .map((point) => (
                  <circle
                    key={point.index}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    className={cn(look.classes.stroke, 'fill-raised')}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </g>
          );
        })}
        {result.buckets.map((bucket, index) => (
          <rect
            key={bucket.key}
            x={geometry.xAt(index) - slot / 2}
            y={0}
            width={slot}
            height={SIZE.height}
            fill="transparent"
            tabIndex={0}
            aria-label={bucketReadout(result, index, units).join(' · ')}
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(index)}
            onBlur={() => onActive(null)}
            className="outline-none"
          />
        ))}
      </svg>
      {active !== null && result.buckets[active] && (
        <ReadoutTip lines={bucketReadout(result, active, units)} index={active} count={count} />
      )}
    </div>
  );
}
