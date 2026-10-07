import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const color = useTokenColor('--on-primary-soft');
  return (
    <View className="items-center gap-3 rounded-card bg-raised px-6 py-16">
      {illustration ??
        (Icon && (
          <View className="size-16 items-center justify-center rounded-full bg-primary-soft">
            <Icon size={28} color={color} strokeWidth={2.75} />
          </View>
        ))}
      <Text className="font-bold text-heading text-ink">{title}</Text>
      <Text className="text-center font-sans text-body text-ink-2">{body}</Text>
      {action && <View className="mt-2 self-stretch">{action}</View>}
    </View>
  );
}
