import type { PlusFeature } from '@babble/config';
import { Sparkles } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';

export function PlusMask({
  locked = true,
  feature,
  title,
  body,
  children,
}: {
  locked?: boolean;
  feature: PlusFeature;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const icon = useTokenColor('--on-primary-soft');
  if (!locked) return children;
  return (
    <View className="min-h-80">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="gap-4 opacity-20"
      >
        {children}
      </View>
      <View className="absolute inset-0 items-center px-2 pt-10">
        <Card className="items-center gap-3 p-6">
          <View className="size-11 items-center justify-center rounded-full bg-primary-soft">
            <Sparkles size={20} color={icon} strokeWidth={2.75} />
          </View>
          <View className="flex-row items-center gap-2">
            <Text accessibilityRole="header" className="font-semibold text-row-title text-ink">
              {title}
            </Text>
            <PlusBadge />
          </View>
          <Text className="text-center font-sans text-meta text-ink-2">{body}</Text>
          <Button onPress={() => setOpen(true)}>See what Plus adds</Button>
        </Card>
      </View>
      <PlusDialog feature={open ? feature : null} onClose={() => setOpen(false)} />
    </View>
  );
}
