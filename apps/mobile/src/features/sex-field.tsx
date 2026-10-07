import type { BabySex } from '@babble/domain';
import { Text, View } from 'react-native';
import { Segmented } from '@/components/segmented';

type Choice = BabySex | 'unset';

export function SexField({ value, onChange }: { value: BabySex | null; onChange: (sex: BabySex | null) => void }) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">Sex</Text>
      <Segmented<Choice>
        value={value ?? 'unset'}
        onChange={(choice) => onChange(choice === 'unset' ? null : choice)}
        options={[
          { value: 'female', label: 'Girl' },
          { value: 'male', label: 'Boy' },
          { value: 'unset', label: 'Not set' },
        ]}
      />
      <Text className="font-sans text-meta text-ink-2">Used to compare growth with the WHO growth charts.</Text>
    </View>
  );
}
