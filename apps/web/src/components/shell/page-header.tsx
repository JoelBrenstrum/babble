import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  backTo,
  title,
  icon,
  subtitle,
  trailing,
}: {
  backTo: LinkProps;
  title: string;
  icon?: ReactNode;
  subtitle?: string | null;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link {...backTo} aria-label="Back" className="grid size-tap place-items-center rounded-full hover:bg-surface">
        <ChevronLeft className="size-6" strokeWidth={2.75} />
      </Link>
      {icon}
      <div className="flex flex-col">
        <h1 className="text-title font-bold">{title}</h1>
        {subtitle && <p className="tabular text-meta text-ink-2">{subtitle}</p>}
      </div>
      {trailing && <span className="ml-auto text-meta text-ink-2">{trailing}</span>}
    </div>
  );
}
