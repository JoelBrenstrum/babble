import type { BabbleClient } from '@babble/api';
import { useCustomTitles } from '@babble/api/react';
import { canSaveCustomTitle, MAX_CUSTOM_TITLE_LENGTH, MAX_SAVED_CUSTOM_TITLES } from '@babble/domain';
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

export function CustomEventSettings({
  client,
  babyId,
  disabled,
}: {
  client: BabbleClient;
  babyId: string;
  disabled: boolean;
}) {
  const { saved, add, remove } = useCustomTitles(client, babyId);
  const [typed, setTyped] = useState('');
  const placeholderColor = useTokenColor('--ink-3');
  const inkColor = useTokenColor('--ink');
  const mutedColor = useTokenColor('--ink-2');
  const error = add.error ?? remove.error;
  const canAdd = canSaveCustomTitle(saved, typed);

  function addTyped() {
    if (!canAdd) return;
    add.mutate(typed);
    setTyped('');
  }

  return (
    <Card className={`gap-4 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
      <View className="gap-1">
        <Text className="font-semibold text-row-title text-ink">Custom event suggestions</Text>
        <Text className="font-sans text-meta text-ink-2">
          Shown as quick picks when you log a custom event, like a medicine or bath. Titles you've used recently show
          too.
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {saved.map((title) => (
          <View key={title} className="h-11 flex-row items-center gap-1 rounded-chip border border-line bg-raised pl-4">
            <Text className="font-sans text-label text-ink">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${title}`}
              onPress={() => remove.mutate(title)}
              className="size-10 items-center justify-center"
            >
              <X size={16} color={mutedColor} strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
        {saved.length === 0 && <Text className="font-sans text-meta text-ink-2">No saved suggestions.</Text>}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          accessibilityLabel="Add a suggestion"
          placeholder="Add a suggestion"
          placeholderTextColor={placeholderColor}
          value={typed}
          maxLength={MAX_CUSTOM_TITLE_LENGTH}
          returnKeyType="done"
          submitBehavior="submit"
          onChangeText={setTyped}
          onSubmitEditing={addTyped}
          className="min-h-tap flex-1 rounded-button border border-line-strong bg-raised px-4 font-sans text-body text-ink"
        />
        <Button
          variant="secondary"
          disabled={!canAdd}
          onPress={addTyped}
          icon={<Plus size={20} color={inkColor} strokeWidth={2.75} />}
        >
          Add
        </Button>
      </View>
      {saved.length >= MAX_SAVED_CUSTOM_TITLES && (
        <Text className="font-sans text-meta text-ink-2">
          You can keep up to {MAX_SAVED_CUSTOM_TITLES} suggestions.
        </Text>
      )}
      {error && <StatusMessage tone="danger">{error.message}</StatusMessage>}
    </Card>
  );
}
