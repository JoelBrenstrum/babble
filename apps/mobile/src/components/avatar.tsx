import { Text, View } from 'react-native';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name }: { name: string }) {
  return (
    <View
      accessibilityLabel={name}
      className="size-9 items-center justify-center rounded-full border-2 border-bg bg-secondary-soft"
    >
      <Text className="font-bold text-label text-on-secondary-soft">{initials(name)}</Text>
    </View>
  );
}
