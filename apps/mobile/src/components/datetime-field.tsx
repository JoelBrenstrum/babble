import { formatShortDate, formatTimeOfDay, fromLocalInputValue, toLocalInputValue } from '@babble/domain';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

function toPickerDate(iso: string, timeZone: string): Date {
  const [date, time] = toLocalInputValue(iso, timeZone).split('T') as [string, string];
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hour, minute);
}

function fromPickerDate(date: Date, timeZone: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return fromLocalInputValue(local, timeZone)!;
}

export function DateTimeField({
  label,
  value,
  onChange,
  timeZone,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  timeZone: string;
  error?: string;
}) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setMode(null);
    if (event.type === 'set' && date) onChange(fromPickerDate(date, timeZone));
  }

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} date`}
          onPress={() => setMode(mode === 'date' ? null : 'date')}
          className={`min-h-tap flex-1 justify-center rounded-button border bg-raised px-4 ${error ? 'border-danger' : 'border-line-strong'}`}
        >
          <Text className="font-sans text-body text-ink">{formatShortDate(value, timeZone)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} time`}
          onPress={() => setMode(mode === 'time' ? null : 'time')}
          className={`min-h-tap flex-1 justify-center rounded-button border bg-raised px-4 ${error ? 'border-danger' : 'border-line-strong'}`}
        >
          <Text className="font-sans text-body text-ink">{formatTimeOfDay(value, timeZone)}</Text>
        </Pressable>
      </View>
      {mode && (
        <DateTimePicker
          value={toPickerDate(value, timeZone)}
          mode={mode}
          display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
          maximumDate={new Date(Date.now() + 5 * 60_000)}
          onChange={handle}
        />
      )}
      {error && <Text className="font-sans text-meta text-danger">{error}</Text>}
    </View>
  );
}
