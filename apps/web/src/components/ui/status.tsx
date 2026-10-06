import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '#/lib/cn';

export function StatusMessage({ tone, children }: { tone: 'danger' | 'success' | 'info'; children: ReactNode }) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-tile px-4 py-3 text-meta',
        tone === 'danger' && 'bg-danger-soft text-on-danger',
        tone === 'success' && 'bg-success-soft text-on-success',
        tone === 'info' && 'bg-info-soft text-on-info',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2.75} />
      <div>{children}</div>
    </div>
  );
}
