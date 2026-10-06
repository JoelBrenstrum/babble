import { Text, View, type ViewProps } from 'react-native';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={`rounded-card bg-raised ${className ?? ''}`} {...props} />;
}

export function SectionLabel({ children }: { children: string }) {
  return <Text className="font-semibold text-section uppercase text-ink-3">{children}</Text>;
}
