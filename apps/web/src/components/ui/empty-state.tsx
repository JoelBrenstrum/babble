import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-raised px-6 py-16 text-center shadow-raised">
      {illustration ??
        (Icon && (
          <span
            aria-hidden
            className="grid size-16 place-items-center rounded-full bg-primary-soft text-on-primary-soft"
          >
            <Icon className="size-7" strokeWidth={2.75} />
          </span>
        ))}
      <h2 className="text-heading font-bold">{title}</h2>
      <p className="max-w-sm text-body text-ink-2">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
