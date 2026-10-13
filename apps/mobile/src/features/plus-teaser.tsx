import type { PlusFeature } from '@babble/config';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';

export function PlusTeaser({ feature, title, body }: { feature: PlusFeature; title: string; body: string }) {
  const [open, setOpen] = useState(false);
  const icon = useTokenColor('--on-primary-soft');
  return (
    <Card className="gap-3 p-5">
      <View className="flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-full bg-primary-soft">
          <Sparkles size={16} color={icon} strokeWidth={2.75} />
        </View>
        <Text accessibilityRole="header" className="flex-1 font-semibold text-row-title text-ink">
          {title}
        </Text>
        <PlusBadge />
      </View>
      <Text className="font-sans text-meta text-ink-2">{body}</Text>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        See what Plus adds
      </Button>
      <PlusDialog feature={open ? feature : null} onClose={() => setOpen(false)} />
    </Card>
  );
}
