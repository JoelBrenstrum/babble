import type { HTMLAttributes } from 'react';
import { cn } from '#/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-raised shadow-raised', className)} {...props} />;
}

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-section font-semibold uppercase text-ink-3', className)} {...props} />;
}
