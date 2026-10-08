import {
  clock,
  exportData,
  exportFileName,
  toBabbleError,
  type BabbleClient,
  type BabyRow,
  type Family,
} from '@babble/api';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';

function downloadJson(fileName: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportData({ client, family, baby }: { client: BabbleClient; family: Family; baby: BabyRow }) {
  const [pending, setPending] = useState<'baby' | 'family' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(scope: 'baby' | 'family') {
    setPending(scope);
    setError(null);
    try {
      const ids = scope === 'baby' ? [baby.id] : family.babies.map((item) => item.id);
      const data = await exportData(client, family, ids, clock.now());
      downloadJson(exportFileName(scope === 'baby' ? baby.name : family.name, data.exportedAt), data);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h3 className="text-row-title font-semibold">Export data</h3>
        <p className="text-meta text-ink-2">
          Download everything as a JSON file: profile, settings and every entry, including deleted ones.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={pending === 'baby'}
          disabled={pending !== null}
          onClick={() => run('baby')}
        >
          {pending !== 'baby' && <Download className="size-4" strokeWidth={2.75} />}
          Export {baby.name}
        </Button>
        {family.babies.length > 1 && (
          <Button
            variant="secondary"
            loading={pending === 'family'}
            disabled={pending !== null}
            onClick={() => run('family')}
          >
            {pending !== 'family' && <Download className="size-4" strokeWidth={2.75} />}
            Export whole family
          </Button>
        )}
      </div>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
