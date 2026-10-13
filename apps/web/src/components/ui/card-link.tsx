import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

export function CardLink({ title, description, ...link }: LinkProps & { title: string; description: string }) {
  return (
    <Link
      {...link}
      className="flex min-h-tap items-center justify-between rounded-card bg-raised px-5 py-4 shadow-raised hover:bg-surface"
    >
      <span>
        <span className="block text-row-title font-semibold">{title}</span>
        <span className="block text-meta text-ink-2">{description}</span>
      </span>
      <ChevronRight className="size-5 text-ink-3" strokeWidth={2.75} />
    </Link>
  );
}
