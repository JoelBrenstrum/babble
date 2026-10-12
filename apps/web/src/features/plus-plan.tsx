import type { PlanSummary } from '@babble/config';
import { Check, Sparkles } from 'lucide-react';
import { Card, SectionLabel } from '#/components/ui/card';

export function PlusPlan({ summary }: { summary: PlanSummary }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Babble Plus</SectionLabel>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Sparkles aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={2.75} />
          <span className="flex-1 text-row-title font-semibold">{summary.plus ? 'Plus' : 'Free'}</span>
          {summary.plus && (
            <span className="rounded-chip bg-primary-soft px-2.5 py-0.5 text-caption font-bold text-on-primary-soft">
              Active
            </span>
          )}
        </div>
        <p className="text-body text-ink-2">{summary.status}</p>
        <div className="flex flex-col gap-2">
          <span className="text-meta font-semibold text-ink-2">{summary.plus ? 'Included' : 'Plus adds'}</span>
          <ul className="flex flex-col gap-2">
            {summary.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-body">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.75} />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}
