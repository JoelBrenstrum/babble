import type { CSSProperties, ReactNode } from 'react';
import { cn } from '#/lib/cn';

export function ChartTip({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-[10px] bg-ink px-2.5 py-1.5 text-caption font-semibold text-bg shadow-toast',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
