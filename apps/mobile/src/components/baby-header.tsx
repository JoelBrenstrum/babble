import type { BabyChoice, BabyRow, Family } from '@babble/api';
import { babyAgeLabel, todayInTimeZone } from '@babble/domain';
import { router } from 'expo-router';
import { Check, ChevronsUpDown, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTokenColor } from '@/lib/theme';
import { Avatar } from './avatar';

const AVATAR_TONES = [
  ['bg-primary', 'text-on-primary'],
  ['bg-secondary', 'text-on-secondary'],
  ['bg-sleep', 'text-ink-on-solid'],
  ['bg-nappy', 'text-ink-on-solid'],
  ['bg-growth', 'text-ink-on-solid'],
] as const;

function BabyAvatar({ name, index, small = false }: { name: string; index: number; small?: boolean }) {
  const [bg, fg] = AVATAR_TONES[Math.max(0, index) % AVATAR_TONES.length]!;
  return (
    <View className={`items-center justify-center rounded-full ${small ? 'size-9' : 'size-11'} ${bg}`}>
      <Text className={`font-bold ${small ? 'text-label' : 'text-heading'} ${fg}`}>{name[0]}</Text>
    </View>
  );
}

export function BabyHeader({
  family,
  baby,
  choices = [],
  onSelect,
}: {
  family: Family;
  baby: BabyRow;
  choices?: readonly BabyChoice[];
  onSelect?: (choice: BabyChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const chevron = useTokenColor('--ink-2');
  const check = useTokenColor('--primary');
  const index = choices.findIndex((choice) => choice.baby.id === baby.id);
  const age = babyAgeLabel(baby.birth_date, todayInTimeZone(baby.timezone));

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${baby.name}, ${age}. Switch baby`}
        onPress={() => setOpen(true)}
        className="flex-1 flex-row items-center gap-3 rounded-card py-1 active:bg-surface"
      >
        <BabyAvatar name={baby.name} index={index} />
        <View className="flex-1">
          <Text className="font-bold text-row-title text-ink">{baby.name}</Text>
          <Text className="font-sans text-meta text-ink-2">{age}</Text>
        </View>
        <ChevronsUpDown size={18} color={chevron} strokeWidth={2.75} />
      </Pressable>
      <View className="flex-row -space-x-2">
        {family.members.map((member) => (
          <Avatar key={member.user_id} name={member.display_name} />
        ))}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" className="flex-1 bg-scrim/40" onPress={() => setOpen(false)} />
        <SafeAreaView edges={['bottom']} className="rounded-t-sheet bg-raised px-4 pb-4 pt-3">
          <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-line-strong" />
          <Text className="mb-2 px-2 font-bold text-heading text-ink">Switch baby</Text>
          {choices.map((choice, choiceIndex) => {
            const selected = choice.baby.id === baby.id;
            return (
              <Pressable
                key={choice.baby.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={choice.baby.name}
                onPress={() => {
                  setOpen(false);
                  if (!selected) onSelect?.(choice);
                }}
                className="min-h-tap-lg flex-row items-center gap-3 rounded-button px-2 py-2 active:bg-surface"
              >
                <BabyAvatar name={choice.baby.name} index={choiceIndex} small />
                <View className="flex-1">
                  <Text className="font-semibold text-body text-ink">{choice.baby.name}</Text>
                  <Text className="font-sans text-meta text-ink-2">
                    {`${babyAgeLabel(choice.baby.birth_date, todayInTimeZone(choice.baby.timezone))}${
                      new Set(choices.map((c) => c.familyId)).size > 1 ? ` · ${choice.familyName}` : ''
                    }`}
                  </Text>
                </View>
                {selected && <Check size={20} color={check} strokeWidth={3} />}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
              router.push({ pathname: '/onboarding/baby', params: { mode: 'add' } });
            }}
            className="mt-1 min-h-tap-lg flex-row items-center gap-3 border-t border-line px-2 pt-3"
          >
            <View className="size-9 items-center justify-center rounded-full border-2 border-dashed border-primary">
              <Plus size={16} color={check} strokeWidth={3} />
            </View>
            <Text className="font-semibold text-body text-primary">Add a baby</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
