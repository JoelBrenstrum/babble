import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';

export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function listTimeZones(): string[] {
  return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [detectTimeZone()];
}

export function TimezoneField({ value, onChange }: { value: string; onChange: (timezone: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const zones = useMemo(listTimeZones, []);
  const filtered = zones.filter((zone) => zone.toLowerCase().includes(query.trim().toLowerCase().replaceAll(' ', '_')));

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">Timezone</Text>
      <View className="min-h-tap flex-row items-center justify-between rounded-button border border-line-strong bg-raised pl-4">
        <Text className="font-sans text-body text-ink">{value.replaceAll('_', ' ')}</Text>
        <Button variant="ghost" onPress={() => setOpen(true)}>
          Change
        </Button>
      </View>
      <Text className="font-sans text-meta text-ink-2">
        Detected from this phone. Times stay correct when you travel.
      </Text>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-bg px-4">
          <View className="gap-3 py-4">
            <TextField label="Search timezones" value={query} onChangeText={setQuery} autoFocus />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(zone) => zone}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className="min-h-tap justify-center border-b border-line"
              >
                <Text className={`text-body ${item === value ? 'font-bold text-primary' : 'font-sans text-ink'}`}>
                  {item.replaceAll('_', ' ')}
                </Text>
              </Pressable>
            )}
          />
          <Button variant="secondary" className="my-4" onPress={() => setOpen(false)}>
            Cancel
          </Button>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
