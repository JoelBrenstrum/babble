import { clock, exportData, exportFileName, type BabbleClient, type BabyRow, type Family } from '@babble/api';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';

async function shareJson(fileName: string, data: unknown) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: fileName });
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
      await shareJson(exportFileName(scope === 'baby' ? baby.name : family.name, data.exportedAt), data);
    } catch {
      setError("Couldn't export. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-3 p-5">
      <Text className="font-semibold text-row-title text-ink">Export data</Text>
      <Text className="font-sans text-meta text-ink-2">
        {scope === 'baby'
          ? 'Save everything as a JSON file: profile, settings and every entry, including deleted ones.'
          : 'Every baby in the family in one JSON file, with family settings and every entry.'}
      </Text>
      <Button variant="secondary" loading={pending} onPress={() => void run()}>
        {scope === 'baby' ? `Export ${baby.name}` : 'Export whole family'}
      </Button>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
