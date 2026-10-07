import { babyChoices, importEvents, queryKeys, toBabbleError } from '@babble/api';
import { HuckleberryCsvError, MAX_IMPORT_BYTES, parseHuckleberryCsv, type HuckleberryImport } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, FileUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SelectField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { ImportPreview } from '#/features/import/import-preview';
import { listTimeZones } from '#/lib/timezones';

export const Route = createFileRoute('/_app/import')({ component: ImportPage });

type Step =
  | { kind: 'choose' }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; imported: number; skipped: number };

function ImportPage() {
  const { babble, baby, families } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const choices = useMemo(() => babyChoices(families), [families]);
  const timeZones = useMemo(listTimeZones, []);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [babyId, setBabyId] = useState(baby.id);
  const [timeZone, setTimeZone] = useState(baby.timezone);
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo((): { result: HuckleberryImport } | { error: string } | null => {
    if (!file) return null;
    try {
      return { result: parseHuckleberryCsv(file.text, { timeZone }) };
    } catch (caught) {
      return { error: caught instanceof HuckleberryCsvError ? caught.message : 'That file could not be read.' };
    }
  }, [file, timeZone]);

  const target = choices.find((choice) => choice.baby.id === babyId);

  async function runImport(result: HuckleberryImport) {
    setError(null);
    setStep({ kind: 'importing', done: 0, total: result.events.length });
    try {
      const totals = await importEvents(babble.client, babyId, result.events, (progress) =>
        setStep({ kind: 'importing', ...progress }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId), refetchType: 'all' });
      setStep({ kind: 'done', ...totals });
    } catch (caught) {
      setError(toBabbleError(caught).message);
      setStep({ kind: 'choose' });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          aria-label="Back"
          className="grid size-tap place-items-center rounded-full hover:bg-surface"
        >
          <ChevronLeft className="size-6" strokeWidth={2.75} />
        </Link>
        <h1 className="text-title font-bold">Import from Huckleberry</h1>
      </div>

      {step.kind === 'done' ? (
        <Card className="flex flex-col gap-4 p-6">
          <p className="text-heading font-bold">
            {step.imported} {step.imported === 1 ? 'entry' : 'entries'} imported
          </p>
          {step.skipped > 0 && (
            <p className="text-body text-ink-2">
              {step.skipped} {step.skipped === 1 ? 'was' : 'were'} already in Babble and left as they were.
            </p>
          )}
          <p className="text-body text-ink-2">Everyone in the family can see them straight away.</p>
          <Link to="/" className="self-start">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      ) : (
        <>
          <p className="text-body text-ink-2">
            In Huckleberry, export your data as a CSV file, then choose it here. The file is read on this device; only
            the entries are sent to your Babble server.
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-raised px-6 py-10 text-center hover:border-primary">
            <FileUp className="size-8 text-primary" strokeWidth={2.5} />
            <span className="text-body font-semibold">{file ? file.name : 'Choose a CSV file'}</span>
            <span className="text-meta text-ink-2">
              {file ? 'Choose a different file' : 'Huckleberry export (.csv)'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Huckleberry CSV file"
              onChange={async (event) => {
                const chosen = event.target.files?.[0];
                if (!chosen) return;
                if (chosen.size > MAX_IMPORT_BYTES) {
                  setFile(null);
                  setError('That file is too big to be a Huckleberry export. Choose the CSV you exported.');
                  return;
                }
                setError(null);
                setFile({ name: chosen.name, text: await chosen.text() });
              }}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Import into" value={babyId} onChange={(event) => setBabyId(event.target.value)}>
              {choices.map((choice) => (
                <option key={choice.baby.id} value={choice.baby.id}>
                  {choice.baby.name}
                  {new Set(choices.map((c) => c.familyId)).size > 1 ? ` (${choice.familyName})` : ''}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Timezone of these records"
              hint="Huckleberry exports local times without a timezone."
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
            >
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </option>
              ))}
            </SelectField>
          </div>

          {parsed && 'error' in parsed && <StatusMessage tone="danger">{parsed.error}</StatusMessage>}
          {error && <StatusMessage tone="danger">{error}</StatusMessage>}

          {parsed && 'result' in parsed && (
            <>
              <ImportPreview result={parsed.result} timeZone={timeZone} />
              {step.kind === 'importing' ? (
                <div role="status" className="flex flex-col gap-2">
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(step.done / Math.max(1, step.total)) * 100}%` }}
                    />
                  </div>
                  <p className="text-meta text-ink-2">
                    Importing… {step.done} of {step.total}
                  </p>
                </div>
              ) : (
                <Button size="lg" disabled={parsed.result.events.length === 0} onClick={() => runImport(parsed.result)}>
                  Import {parsed.result.events.length} {parsed.result.events.length === 1 ? 'entry' : 'entries'} into{' '}
                  {target?.baby.name}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
