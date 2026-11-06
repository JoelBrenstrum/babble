import { barAnchor } from '@babble/domain';
import type { ReactNode } from 'react';
import { ChartTip } from '#/components/ui/chart-tip';

export interface ChartProps {
  active: number | null;
  onActive: (index: number | null) => void;
}

export function tipPosition(index: number, count: number) {
  const anchor = barAnchor(index, count);
  return {
    className: anchor.edge === 'center' ? '-translate-x-1/2' : '',
    style: { [anchor.edge === 'right' ? 'right' : 'left']: `${anchor.percent}%` },
  };
}

export function ReadoutTip({ lines, index, count }: { lines: string[]; index: number; count: number }) {
  const position = tipPosition(index, count);
  return (
    <ChartTip className={`bottom-full mb-2 max-w-full ${position.className}`} style={position.style}>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </ChartTip>
  );
}

export function ChartFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-1.5" role="group" aria-label={label}>
      {children}
    </div>
  );
}
