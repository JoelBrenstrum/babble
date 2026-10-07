import { createFileRoute } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { EmptyState } from '#/components/ui/empty-state';

export const Route = createFileRoute('/_app/timeline')({
  component: () => (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold">Timeline</h1>
      <EmptyState icon={History} title="Nothing on the timeline yet">
        Daily and weekly timelines appear here once you start logging.
      </EmptyState>
    </div>
  ),
});
