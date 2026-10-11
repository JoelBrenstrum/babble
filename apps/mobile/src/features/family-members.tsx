import {
  canRemoveMember,
  canRenameMember,
  MAX_MEMBER_NAME,
  memberNameError,
  removeMember,
  renameMember,
  toBabbleError,
  type BabbleClient,
  type Family,
} from '@babble/api';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';

const ROLE_LABELS = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' } as const;

type Member = Family['members'][number];

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
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      await onChanged();
      setRenaming(null);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  function save(member: Member) {
    const problem = memberNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void run(() => renameMember(client, { familyId: family.id, userId: member.user_id }, name));
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
          onPress: () => void run(() => removeMember(client, { familyId: family.id, userId: member.user_id })),
        },
      ],
    );
  }

  return (
    <View className="gap-3">
      <Card>
        {family.members.map((member, index) => {
          const you = member.user_id === userId;
          const editing = renaming === member.user_id;
          return (
            <View key={member.user_id} className={`gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}>
              <View className="flex-row items-center gap-3">
                <Avatar name={member.display_name} />
                <View className="flex-1">
                  <Text className="font-semibold text-row-title text-ink" numberOfLines={1}>
                    {member.display_name}
                    {you ? ' (you)' : ''}
                  </Text>
                  <Text className="font-sans text-meta text-ink-2">{ROLE_LABELS[member.role]}</Text>
                </View>
                {!editing && canRenameMember(family, userId, member.user_id) && (
                  <RowAction
                    label={`Rename ${member.display_name}`}
                    text="Rename"
                    onPress={() => {
                      setError(null);
                      setName(member.display_name);
                      setRenaming(member.user_id);
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
              {editing && (
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
                    <Button variant="ghost" onPress={() => setRenaming(null)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Card>
      {error && renaming === null && <StatusMessage tone="danger">{error}</StatusMessage>}
    </View>
  );
}
