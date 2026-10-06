import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTokenColor } from '@/lib/theme';

export function TextField({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const placeholderColor = useTokenColor('--ink-3');
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={placeholderColor}
        className={`min-h-tap rounded-button border bg-raised px-4 font-sans text-body text-ink ${error ? 'border-danger' : 'border-line-strong'}`}
        {...props}
      />
      {(error || hint) && (
        <Text className={`font-sans text-meta ${error ? 'text-danger' : 'text-ink-2'}`}>{error ?? hint}</Text>
      )}
    </View>
  );
}
