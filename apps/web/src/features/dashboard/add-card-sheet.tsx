import type { SavedReport } from '@babble/api';
import {
  hasCard,
  PLUS_PREBUILT,
  PREBUILT_CARDS,
  PREBUILT_LABELS,
  type DashboardLayout,
  type NewDashboardCard,
} from '@babble/domain';
import { ChartSpline, Plus, StickyNote } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { ModalSheet } from '#/components/ui/modal-sheet';
import { PlusBadge } from '#/features/plus-dialog';

function Row({
  label,
  badge,
  disabled,
  onClick,
}: {
  label: string;
  badge?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-tap w-full items-center gap-3 rounded-tile px-3 text-left text-body hover:bg-surface disabled:opacity-45"
    >
      <Plus className="size-4 text-primary" strokeWidth={2.75} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && <PlusBadge />}
    </button>
  );
}

export function AddCardSheet({
  layout,
  reports,
  plusLocked,
  onAdd,
  onClose,
}: {
  layout: DashboardLayout;
  reports: SavedReport[];
  plusLocked: boolean;
  onAdd: (card: NewDashboardCard) => void;
  onClose: () => void;
}) {
  const prebuilt = PREBUILT_CARDS.filter((card) => !hasCard(layout, { kind: 'prebuilt', card }));
  const saved = reports.filter((report) => !hasCard(layout, { kind: 'report', reportId: report.id }));
  const add = (card: NewDashboardCard) => {
    onAdd(card);
    onClose();
  };
  return (
    <ModalSheet labelledBy="add-card-title" onClose={onClose} className="max-h-[85vh] overflow-y-auto">
      <h2 id="add-card-title" className="text-heading font-bold">
        Add card
      </h2>
      {prebuilt.length > 0 && (
        <section className="flex flex-col gap-1" aria-labelledby="add-prebuilt">
          <h3 id="add-prebuilt" className="text-caption font-semibold uppercase text-ink-3">
            Stats
          </h3>
          {prebuilt.map((card) => {
            const plus = PLUS_PREBUILT.includes(card);
            return (
              <Row
                key={card}
                label={PREBUILT_LABELS[card]}
                badge={plus}
                disabled={plus && plusLocked}
                onClick={() => add({ kind: 'prebuilt', card, size: 's' })}
              />
            );
          })}
        </section>
      )}
      <section className="flex flex-col gap-1" aria-labelledby="add-reports">
        <h3 id="add-reports" className="flex items-center gap-2 text-caption font-semibold uppercase text-ink-3">
          <ChartSpline className="size-3.5" strokeWidth={2.75} />
          Saved reports
        </h3>
        {saved.length === 0 ? (
          <p className="px-3 py-2 text-meta text-ink-3">
            Every saved report is on the dashboard. Save more in Reports.
          </p>
        ) : (
          saved.map((report) => (
            <Row
              key={report.id}
              label={report.name}
              onClick={() => add({ kind: 'report', reportId: report.id, size: 'm' })}
            />
          ))
        )}
      </section>
      <section className="flex flex-col gap-1" aria-labelledby="add-note">
        <h3 id="add-note" className="flex items-center gap-2 text-caption font-semibold uppercase text-ink-3">
          <StickyNote className="size-3.5" strokeWidth={2.75} />
          Note
        </h3>
        <Row label="A short note between the cards" onClick={() => add({ kind: 'text', body: '', size: 's' })} />
      </section>
      <Button variant="secondary" size="lg" onClick={onClose}>
        Close
      </Button>
    </ModalSheet>
  );
}
