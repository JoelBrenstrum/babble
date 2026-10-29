import type { SavedReport } from '@babble/api';
import { REPORT_LIMIT_MESSAGE } from '@babble/config';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { ModalSheet } from '#/components/ui/modal-sheet';
import { StatusMessage } from '#/components/ui/status';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';

export function SaveReportDialog({
  initialName,
  reports,
  atLimit,
  saving,
  error,
  onSave,
  onReplace,
  onClose,
}: {
  initialName: string;
  reports: SavedReport[];
  atLimit: boolean;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onReplace: (reportId: string, name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [pitching, setPitching] = useState(false);
  const trimmed = name.trim();
  return (
    <ModalSheet labelledBy="save-report-title" onClose={onClose}>
      <h2 id="save-report-title" className="text-heading font-bold">
        Save report
      </h2>
      {atLimit && (
        <div className="flex flex-col gap-3 rounded-tile bg-caution-soft p-4 text-on-caution">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0" strokeWidth={2.75} />
            <span className="text-label font-semibold">You've saved {reports.length} reports</span>
            <PlusBadge />
          </div>
          <p className="text-meta">{REPORT_LIMIT_MESSAGE}</p>
          <Button className="self-start" onClick={() => setPitching(true)}>
            See Plus
          </Button>
        </div>
      )}
      <TextField autoFocus label="Name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      <p className="text-meta text-ink-2">Shared with your family.</p>
      {atLimit && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label font-semibold">Or replace one</legend>
          {reports.map((report) => (
            <label
              key={report.id}
              className={cn(
                'flex h-tap cursor-pointer items-center gap-3 rounded-tile border px-3 text-body',
                replacing === report.id ? 'border-primary bg-primary-soft' : 'border-line',
              )}
            >
              <input
                type="radio"
                name="replace-report"
                className="accent-primary"
                checked={replacing === report.id}
                onChange={() => setReplacing(report.id)}
              />
              <span className="min-w-0 flex-1 truncate">{report.name}</span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <div className="flex flex-col gap-2">
        {atLimit ? (
          <Button
            size="lg"
            variant="secondary"
            disabled={!replacing || !trimmed}
            loading={saving}
            onClick={() => replacing && onReplace(replacing, trimmed)}
          >
            Replace
          </Button>
        ) : (
          <Button size="lg" disabled={!trimmed} loading={saving} onClick={() => onSave(trimmed)}>
            Save
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {pitching && <PlusDialog feature="unlimited_reports" onClose={() => setPitching(false)} />}
    </ModalSheet>
  );
}
