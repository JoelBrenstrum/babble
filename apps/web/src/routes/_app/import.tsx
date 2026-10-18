import { babyChoices, canLog, importEvents, type ImportSource } from '@babble/api';
import { refreshEvents, useAsyncAction } from '@babble/api/react';
import type { HuckleberryImport } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { PageHeader } from '#/components/shell/page-header';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SelectField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { ImportDropzone } from '#/features/import/import-dropzone';
import {
  exportedBabies,
  importProgressPercent,
  importTooBig,
  parseImportFile,
  readyImport,
  spansFamilies,
} from '#/features/import/import-file';
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
  const showFamilies = spansFamilies(choices);
  const timeZones = useMemo(listTimeZones, []);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [babyId, setBabyId] = useState(baby.id);
  const [timeZone, setTimeZone] = useState(baby.timezone);
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const { run, error, setError } = useAsyncAction();
  const [fromIndex, setFromIndex] = useState(0);

  async function choose(chosen: File) {
    if (importTooBig(chosen.size)) {
      setFile(null);
      setError('That file is too big to import. Choose a babble or Huckleberry export.');
      return;
    }
    setError(null);
    setFromIndex(0);
    setFile({ name: chosen.name, text: await chosen.text() });
  }

  const parsed = useMemo(() => (file ? parseImportFile(file.text, timeZone) : null), [file, timeZone]);
  const babies = exportedBabies(parsed);
  const ready = readyImport(parsed, fromIndex);
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

          <ImportDropzone fileName={file?.name ?? null} onChoose={(chosen) => void choose(chosen)} />

          <div className="grid gap-5 sm:grid-cols-2">
            {babies && babies.length > 1 && (
              <SelectField
                label="Baby in the file"
                value={String(fromIndex)}
                onChange={(event) => setFromIndex(Number(event.target.value))}
              >
                {babies.map((exported, index) => (
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
                  {showFamilies ? ` (${choice.familyName})` : ''}
                </option>
              ))}
            </SelectField>
            {!babies && (
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
                      style={{ width: `${importProgressPercent(step.done, step.total)}%` }}
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
