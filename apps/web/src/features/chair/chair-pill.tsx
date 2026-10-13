import type { ReactNode } from 'react';
import { cn } from '#/lib/cn';
import { FLOATING_PILL } from './styles';

export function ChairPill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div role="status" className={cn(FLOATING_PILL, className)}>
      {children}
    </div>
  );
}
