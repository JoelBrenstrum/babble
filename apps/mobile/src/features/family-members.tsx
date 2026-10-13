import {
  adminCount,
  canChangeRole,
  canRemoveMember,
  canRenameMember,
  MAX_MEMBER_NAME,
  memberNameError,
  removeMember,
  renameMember,
  setMemberRole,
  type BabbleClient,
  type Family,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { roleLabel, type MemberRole } from '@babble/domain';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { RolePicker } from '@/features/role-picker';

type Member = Family['members'][number];
type Mode = { kind: 'rename' | 'role'; userId: string } | null;

function RowAction({
  label,
  text,
  danger,
  onPress,
}: {
  label: string;
  text: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="min-h-tap justify-center rounded-button px-3 active:bg-surface"
      onPress={onPress}
    >
      <Text className={`font-semibold text-body ${danger ? 'text-danger' : 'text-primary'}`}>{text}</Text>
    </Pressable>
  );
}

export function FamilyMembers({
  client,
  family,
  userId,
  onChanged,
}: {
  client: BabbleClient;
  family: Family;
  userId: string;
  onChanged: () => Promise<unknown>;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('caregiver');
  const { run, busy, error, setError } = useAsyncAction();
  const soleAdmin = adminCount(family) === 1;

  async function change(task: () => Promise<void>) {
    const changed = await run(async () => {
      await task();
      await onChanged();
    });
    if (changed) setMode(null);
  }

  function save(member: Member) {
    const problem = memberNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void change(() => renameMember(client, { familyId: family.id, userId: member.user_id }, name));
  }

  function confirmRemove(member: Member) {
    Alert.alert(
      `Remove ${member.display_name}?`,
      `They'll lose access to ${family.name} straight away. What they logged stays.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void change(() => removeMember(client, { familyId: family.id, userId: member.user_id })),
        },
      ],
    );
  }

  return (
    <View className="gap-3">
      <Card>
        {family.members.map((member, index) => {
          const you = member.user_id === userId;
          const editing = mode?.userId === member.user_id ? mode.kind : null;
          const roleChangeable =
            canChangeRole(family, userId, member.user_id) && !(you && soleAdmin && member.role === 'owner');
          return (
            <View key={member.user_id} className={`gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}>
              <View className="flex-row items-center gap-3">
                <Avatar name={member.display_name} />
                <View className="flex-1">
                  <Text className="font-semibold text-row-title text-ink" numberOfLines={1}>
                    {member.display_name}
                    {you ? ' (you)' : ''}
                  </Text>
                  <Text className="font-sans text-meta text-ink-2">{roleLabel(member.role)}</Text>
                </View>
                {!editing && canRenameMember(family, userId, member.user_id) && (
                  <RowAction
                    label={`Rename ${member.display_name}`}
                    text="Rename"
                    onPress={() => {
                      setError(null);
                      setName(member.display_name);
                      setMode({ kind: 'rename', userId: member.user_id });
                    }}
                  />
                )}
                {!editing && roleChangeable && (
                  <RowAction
                    label={`Change ${member.display_name}'s role`}
                    text="Role"
                    onPress={() => {
                      setError(null);
                      setRole(member.role);
                      setMode({ kind: 'role', userId: member.user_id });
                    }}
                  />
                )}
                {!editing && canRemoveMember(family, userId, member.user_id) && (
                  <RowAction
                    label={`Remove ${member.display_name}`}
                    text="Remove"
                    danger
                    onPress={() => {
                      setError(null);
                      confirmRemove(member);
                    }}
                  />
                )}
              </View>
              {editing === 'role' && (
                <View className="gap-3">
                  <RolePicker value={role} onChange={setRole} />
                  {error && <StatusMessage tone="danger">{error}</StatusMessage>}
                  <View className="flex-row gap-3">
                    <Button
                      loading={busy}
                      disabled={role === member.role}
                      onPress={() =>
                        void change(() => setMemberRole(client, { familyId: family.id, userId: member.user_id }, role))
                      }
                    >
                      Save role
                    </Button>
                    <Button variant="ghost" onPress={() => setMode(null)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
              {editing === 'rename' && (
                <View className="gap-3">
                  <TextField
                    label={you ? 'Your name' : `${member.display_name}'s name`}
                    value={name}
                    maxLength={MAX_MEMBER_NAME}
                    autoFocus
                    error={error}
                    onChangeText={setName}
                    onSubmitEditing={() => save(member)}
                  />
                  <View className="flex-row gap-3">
                    <Button loading={busy} onPress={() => save(member)}>
                      Save
                    </Button>
                    <Button variant="ghost" onPress={() => setMode(null)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Card>
      {error && mode === null && <StatusMessage tone="danger">{error}</StatusMessage>}
    </View>
  );
}
