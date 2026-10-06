import { createFileRoute } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { EmptyState } from '#/components/ui/empty-state';

export const Route = createFileRoute('/_app/history')({
  component: () => (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold">History</h1>
      <EmptyState icon={History} title="No history yet">
        Daily and weekly timelines appear here once you start logging.
      </EmptyState>
    </div>
  ),
});
