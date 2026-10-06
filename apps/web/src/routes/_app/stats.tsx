import { createFileRoute } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { EmptyState } from '#/components/ui/empty-state';

export const Route = createFileRoute('/_app/stats')({
  component: () => (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold">Stats</h1>
      <EmptyState icon={ChartColumn} title="Insights are on the way">
        Trends for sleep, feeds and nappies will show up here in a later update.
      </EmptyState>
    </div>
  ),
});
