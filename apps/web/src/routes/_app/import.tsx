import {
  BabbleExportError,
  babyChoices,
  canLog,
  importEvents,
  looksLikeJson,
  readBabbleExport,
  type ExportedBaby,
  type ImportSource,
} from '@babble/api';
import { refreshEvents, useAsyncAction } from '@babble/api/react';
import { HuckleberryCsvError, MAX_IMPORT_BYTES, parseHuckleberryCsv, type HuckleberryImport } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { FileUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '#/components/shell/page-header';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SelectField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { ImportPreview } from '#/features/import/import-preview';
import { listTimeZones } from '#/lib/timezones';

export const Route = createFileRoute('/_app/import')({
  beforeLoad: ({ context }) => {
    if (!context.canLog) throw redirect({ to: '/settings' });
  },
  component: ImportPage,
});

type Step =
  | { kind: 'choose' }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; imported: number; skipped: number };

function ImportPage() {
  const { babble, baby, families, session } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const choices = useMemo(
    () => babyChoices(families.filter((family) => canLog(family, session.user.id))),
    [families, session.user.id],
  );
  const timeZones = useMemo(listTimeZones, []);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [babyId, setBabyId] = useState(baby.id);
  const [timeZone, setTimeZone] = useState(baby.timezone);
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const { run, error, setError } = useAsyncAction();

  const [fromIndex, setFromIndex] = useState(0);

  const parsed = useMemo(():
    | { source: 'huckleberry_csv'; result: HuckleberryImport }
    | { source: 'babble_export'; babies: ExportedBaby[] }
    | { error: string }
    | null => {
    if (!file) return null;
    try {
      if (looksLikeJson(file.text)) return { source: 'babble_export', babies: readBabbleExport(file.text) };
      return { source: 'huckleberry_csv', result: parseHuckleberryCsv(file.text, { timeZone }) };
    } catch (caught) {
      return {
        error:
          caught instanceof HuckleberryCsvError || caught instanceof BabbleExportError
            ? caught.message
            : 'That file could not be read.',
      };
    }
  }, [file, timeZone]);

  const ready =
    parsed && 'source' in parsed
      ? parsed.source === 'huckleberry_csv'
        ? { source: parsed.source, result: parsed.result }
        : { source: parsed.source, result: (parsed.babies[fromIndex] ?? parsed.babies[0]!).result }
      : null;

  const target = choices.find((choice) => choice.baby.id === babyId);

  async function runImport(result: HuckleberryImport, source: ImportSource) {
    setStep({ kind: 'importing', done: 0, total: result.events.length });
    const ok = await run(async () => {
      const totals = await importEvents(
        babble.client,
        babyId,
        result.events,
        (progress) => setStep({ kind: 'importing', ...progress }),
        source,
      );
      await refreshEvents(queryClient, babyId);
      setStep({ kind: 'done', ...totals });
    });
    if (!ok) setStep({ kind: 'choose' });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader backTo={{ to: '/settings' }} title="Import data" />

      {step.kind === 'done' ? (
        <Card className="flex flex-col gap-4 p-6">
          <p className="text-heading font-bold">
            {step.imported} {step.imported === 1 ? 'entry' : 'entries'} imported
          </p>
          {step.skipped > 0 && (
            <p className="text-body text-ink-2">
              {step.skipped} {step.skipped === 1 ? 'was' : 'were'} already in babble and left as they were.
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
            Choose a babble export (.json, from Settings → Export) or a Huckleberry CSV export. The file is read on this
            device; only the entries are sent to your babble server.
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-raised px-6 py-10 text-center has-focus-visible:ring-2 has-focus-visible:ring-primary hover:border-primary">
            <FileUp className="size-8 text-primary" strokeWidth={2.5} />
            <span className="text-body font-semibold">{file ? file.name : 'Choose a file'}</span>
            <span className="text-meta text-ink-2">
              {file ? 'Choose a different file' : 'babble export (.json) or Huckleberry export (.csv)'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv,.json,application/json"
              className="sr-only"
              aria-label="File to import"
              onChange={async (event) => {
                const chosen = event.target.files?.[0];
                if (!chosen) return;
                if (chosen.size > MAX_IMPORT_BYTES) {
                  setFile(null);
                  setError('That file is too big to import. Choose a babble or Huckleberry export.');
                  return;
                }
                setError(null);
                setFromIndex(0);
                setFile({ name: chosen.name, text: await chosen.text() });
              }}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            {parsed && 'babies' in parsed && parsed.babies.length > 1 && (
              <SelectField
                label="Baby in the file"
                value={String(fromIndex)}
                onChange={(event) => setFromIndex(Number(event.target.value))}
              >
                {parsed.babies.map((exported, index) => (
                  <option key={index} value={index}>
                    {exported.name}
                  </option>
                ))}
              </SelectField>
            )}
            <SelectField label="Import into" value={babyId} onChange={(event) => setBabyId(event.target.value)}>
              {choices.map((choice) => (
                <option key={choice.baby.id} value={choice.baby.id}>
                  {choice.baby.name}
                  {new Set(choices.map((c) => c.familyId)).size > 1 ? ` (${choice.familyName})` : ''}
                </option>
              ))}
            </SelectField>
            {!(parsed && 'babies' in parsed) && (
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
            )}
          </div>

          {parsed && 'error' in parsed && <StatusMessage tone="danger">{parsed.error}</StatusMessage>}
          {error && <StatusMessage tone="danger">{error}</StatusMessage>}

          {ready && (
            <>
              <ImportPreview result={ready.result} timeZone={timeZone} source={ready.source} />
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
                <Button
                  size="lg"
                  disabled={ready.result.events.length === 0}
                  onClick={() => runImport(ready.result, ready.source)}
                >
                  Import {ready.result.events.length} {ready.result.events.length === 1 ? 'entry' : 'entries'} into{' '}
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
