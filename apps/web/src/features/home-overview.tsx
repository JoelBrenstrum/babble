import type { BabyRow } from '@babble/api';
import {
  formatAgo,
  formatDuration,
  formatShortDate,
  sinceReference,
  summariseLatest,
  TRACKERS,
  type BabyEvent,
  type DaySummary,
  type Units,
} from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { AlarmClock, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '#/components/ui/card';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { cn } from '#/lib/cn';

export interface HomeOverviewProps {
  baby: BabyRow;
  running: BabyEvent[];
  latest: BabyEvent[];
  summary: Pick<DaySummary, 'sleepMs' | 'feeds' | 'nappies'> | null;
  units: Units;
  now: Date;
  renderRunning: (event: BabyEvent) => ReactNode;
  feedDue?: { text: string; overdue: boolean } | null;
}

export function latestMeta(event: BabyEvent | undefined, now: Date, units: Units, timeZone: string): string {
  if (!event) return 'Nothing logged yet';
  if (event.endedAt === null && event.type !== 'bottle') return summariseLatest(event, now, units);
  if (event.type === 'growth') {
    const [first] = summariseLatest(event, now, units).split(' · ');
    return `${first} · ${formatShortDate(event.startedAt, timeZone)}`;
  }
  const reference = sinceReference(event);
  const detail = summariseLatest(event, now, units);
  return `Last ${formatAgo(now.getTime() - Date.parse(reference))}${detail ? ` · ${detail}` : ''}`;
}

export function HomeOverview({
  baby,
  running,
  latest,
  summary,
  units,
  now,
  renderRunning,
  feedDue = null,
}: HomeOverviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="hidden md:block">
        <h1 className="text-title font-bold">Today</h1>
        <p className="mt-1 text-body text-ink-2">{baby.name}'s day so far.</p>
      </div>

      {running.map((event) => (
        <div key={event.id}>{renderRunning(event)}</div>
      ))}

      {feedDue && (
        <p
          role="status"
          className={cn(
            'flex items-center gap-3 rounded-card px-4 py-3 text-body font-semibold',
            feedDue.overdue ? 'bg-caution-soft text-on-caution' : 'bg-feed-right-soft text-on-feed-right',
          )}
        >
          <AlarmClock aria-hidden className="size-5 shrink-0" strokeWidth={2.75} />
          {feedDue.text}
        </p>
      )}

      <Card className="grid grid-cols-3 divide-x divide-line">
        {[
          ['Sleep today', summary ? formatDuration(summary.sleepMs, { seconds: false }) : '—'],
          ['Feeds', summary ? String(summary.feeds) : '—'],
          ['Nappies', summary ? String(summary.nappies) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-4">
            <div className="text-meta text-ink-2">{label}</div>
            <div className="tabular text-heading font-bold">{value}</div>
          </div>
        ))}
      </Card>

      <Card className="divide-y divide-line overflow-hidden">
        {TRACKERS.map((tracker) => {
          const event = latest.find((item) => item.type === tracker.key);
          const live = event?.endedAt === null && tracker.key !== 'bottle';
          return (
            <div key={tracker.key} className="flex items-center transition-colors duration-fast hover:bg-surface">
              <Link
                to="/track/$type"
                params={{ type: tracker.key }}
                className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 focus-visible:bg-surface"
              >
                <TrackerIcon tracker={tracker} />
                <span className="min-w-0 flex-1">
                  <span className="block text-row-title font-semibold">{tracker.label}</span>
                  <span
                    className={
                      live
                        ? 'block truncate text-meta font-semibold text-primary'
                        : 'block truncate text-meta text-ink-2'
                    }
                  >
                    {latestMeta(event, now, units, baby.timezone)}
                  </span>
                </span>
              </Link>
              <Link
                to="/track/$type/new"
                params={{ type: tracker.key }}
                aria-label={`Log ${tracker.label.toLowerCase()}`}
                className="mr-3 grid size-tap shrink-0 place-items-center rounded-full border border-line bg-raised text-ink hover:border-line-strong hover:bg-bg"
              >
                <Plus className="size-5" strokeWidth={2.75} />
              </Link>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
