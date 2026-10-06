import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({
  children,
  step,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  step?: string;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="grow px-4 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          {step && (
            <View className="mb-6 flex-row items-center justify-between">
              <Wordmark />
              <Text className="font-semibold text-meta text-ink-3">{step}</Text>
            </View>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Wordmark() {
  return <Text className="font-brand text-[28px] text-primary">Babble</Text>;
}

export function Title({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <View className="mb-8 gap-2">
      <Text className="font-bold text-title text-ink">{children}</Text>
      {subtitle && <Text className="font-sans text-body text-ink-2">{subtitle}</Text>}
    </View>
  );
}
