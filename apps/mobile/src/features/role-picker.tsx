import { MEMBER_ROLES, roleDescription, roleLabel, type MemberRole } from '@babble/domain';
import { Text, View } from 'react-native';
import { Segmented } from '@/components/segmented';

const OPTIONS = MEMBER_ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

export function RolePicker({ value, onChange }: { value: MemberRole; onChange: (role: MemberRole) => void }) {
  return (
    <View className="gap-2">
      <Segmented value={value} options={OPTIONS} onChange={onChange} />
      <Text className="font-sans text-meta text-ink-2">{roleDescription(value)}</Text>
    </View>
  );
}
