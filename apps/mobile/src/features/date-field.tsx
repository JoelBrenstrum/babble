import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function DateField({
  label,
  value,
  onChange,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  }

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        className="min-h-tap justify-center rounded-button border border-line-strong bg-raised px-4"
      >
        <Text className={`font-sans text-body ${value ? 'text-ink' : 'text-ink-3'}`}>
          {value ? fromIsoDate(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Choose a date'}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? fromIsoDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate}
          onChange={handle}
        />
      )}
    </View>
  );
}
