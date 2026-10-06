import { TRACKERS } from '@babble/domain';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { TrackerIcon } from '#/components/ui/tracker-icon';

export const Route = createFileRoute('/_app/')({ component: HomePage });

function HomePage() {
  const { baby } = Route.useRouteContext();
  return (
    <div className="flex flex-col gap-6">
      <div className="hidden md:block">
        <h1 className="text-title font-bold">Today</h1>
        <p className="mt-1 text-body text-ink-2">Logging for {baby.name} arrives in the next update.</p>
      </div>

      <Card className="grid grid-cols-3 divide-x divide-line">
        {[
          ['Sleep today', '—'],
          ['Feeds', '—'],
          ['Nappies', '—'],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-4">
            <div className="text-meta text-ink-2">{label}</div>
            <div className="tabular text-heading font-bold">{value}</div>
          </div>
        ))}
      </Card>

      <Card className="divide-y divide-line">
        {TRACKERS.map((tracker) => (
          <div key={tracker.key} className="flex items-center gap-4 px-4 py-3">
            <TrackerIcon tracker={tracker} />
            <div className="min-w-0 flex-1">
              <div className="text-row-title font-semibold">{tracker.label}</div>
              <div className="text-meta text-ink-2">Nothing logged yet</div>
            </div>
            <button
              type="button"
              disabled
              title="Coming soon"
              aria-label={`Log ${tracker.label.toLowerCase()}`}
              className="grid size-tap place-items-center rounded-full border border-line text-ink-2 disabled:opacity-45"
            >
              <Plus className="size-5" strokeWidth={2.75} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
