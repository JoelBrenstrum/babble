import {
  clock,
  exportData,
  exportFileName,
  toBabbleError,
  type BabbleClient,
  type BabyRow,
  type Family,
} from '@babble/api';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';

async function shareJson(fileName: string, data: unknown) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: fileName });
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
      await shareJson(exportFileName(scope === 'baby' ? baby.name : family.name, data.exportedAt), data);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="gap-3 p-5">
      <Text className="font-semibold text-row-title text-ink">Export data</Text>
      <Text className="font-sans text-meta text-ink-2">
        Save everything as a JSON file: profile, settings and every entry, including deleted ones.
      </Text>
      <View className="gap-2">
        <Button
          variant="secondary"
          loading={pending === 'baby'}
          disabled={pending !== null}
          onPress={() => void run('baby')}
        >
          {`Export ${baby.name}`}
        </Button>
        {family.babies.length > 1 && (
          <Button
            variant="secondary"
            loading={pending === 'family'}
            disabled={pending !== null}
            onPress={() => void run('family')}
          >
            Export whole family
          </Button>
        )}
      </View>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
