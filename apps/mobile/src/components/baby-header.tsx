import type { BabyRow, Family } from '@babble/api';
import { babyAgeLabel, todayInTimeZone } from '@babble/domain';
import { Text, View } from 'react-native';
import { Avatar } from './avatar';

export function BabyHeader({ family, baby }: { family: Family; baby: BabyRow }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-11 items-center justify-center rounded-full bg-primary">
        <Text className="font-bold text-heading text-on-primary">{baby.name[0]}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-bold text-row-title text-ink">{baby.name}</Text>
        <Text className="font-sans text-meta text-ink-2">
          {babyAgeLabel(baby.birth_date, todayInTimeZone(baby.timezone))}
        </Text>
      </View>
      <View className="flex-row -space-x-2">
        {family.members.map((member) => (
          <Avatar key={member.user_id} name={member.display_name} />
        ))}
      </View>
    </View>
  );
}
