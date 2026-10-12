import { clock, exportData, exportFileName, type BabbleClient, type BabyRow, type Family } from '@babble/api';
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

export function ExportData({
  client,
  family,
  baby,
  scope,
}: {
  client: BabbleClient;
  family: Family;
  baby: BabyRow;
  scope: 'baby' | 'family';
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const ids = scope === 'baby' ? [baby.id] : family.babies.map((item) => item.id);
      const data = await exportData(client, family, ids, clock.now());
      downloadJson(exportFileName(scope === 'baby' ? baby.name : family.name, data.exportedAt), data);
    } catch {
      setError("Couldn't export. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h3 className="text-row-title font-semibold">Export data</h3>
        <p className="text-meta text-ink-2">
          {scope === 'baby'
            ? 'Download everything as a JSON file: profile, settings and every entry, including deleted ones.'
            : 'Every baby in the family in one JSON file, with family settings and every entry.'}
        </p>
      </div>
      <Button variant="secondary" className="self-start" loading={pending} onClick={run}>
        {!pending && <Download className="size-4" strokeWidth={2.75} />}
        {scope === 'baby' ? `Export ${baby.name}` : 'Export whole family'}
      </Button>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
