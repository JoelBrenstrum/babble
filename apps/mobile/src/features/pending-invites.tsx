import {
  createInvite,
  pendingInvitesQuery,
  queryKeys,
  revokeInvite,
  toBabbleError,
  type BabbleClient,
  type Family,
  type PendingInvite,
} from '@babble/api';
import { caregiversHeading, pendingInviteMeta } from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

export function CaregiversLabel({
  client,
  familyId,
  editable,
}: {
  client: BabbleClient;
  familyId: string;
  editable: boolean;
}) {
  const invites = useQuery({ ...pendingInvitesQuery(client, familyId), enabled: editable }).data;
  return <SectionLabel>{caregiversHeading(editable ? (invites?.length ?? 0) : 0)}</SectionLabel>;
}

export function useCreateInvite(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    const invite = await createInvite(client, familyId);
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(familyId) });
    return invite;
  }, [client, familyId, queryClient]);
}

export function PendingInvites({ client, family }: { client: BabbleClient; family: Family }) {
  const queryClient = useQueryClient();
  const iconColor = useTokenColor('--ink-2');
  const invites = useQuery(pendingInvitesQuery(client, family.id)).data ?? [];
  const names = useMemo(
    () => new Map(family.members.map((member) => [member.user_id, member.display_name])),
    [family.members],
  );
  const [error, setError] = useState<string | null>(null);

  async function revoke(invite: PendingInvite) {
    setError(null);
    try {
      await revokeInvite(client, invite.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(family.id) });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  function confirmRevoke(invite: PendingInvite) {
    Alert.alert('Revoke this invite?', 'The code will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => void revoke(invite) },
    ]);
  }

  if (invites.length === 0) return null;
  const now = new Date();

  return (
    <View className="gap-3">
      <Card accessibilityLabel="Pending invites">
        {invites.map((invite, index) => (
          <View
            key={invite.id}
            className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <View className="size-9 items-center justify-center rounded-full bg-surface">
              <Ticket size={20} color={iconColor} strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-row-title tracking-wider text-ink">{invite.code}</Text>
              <Text className="font-sans text-meta text-ink-2">{pendingInviteMeta(invite, names, now)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Revoke invite ${invite.code}`}
              hitSlop={8}
              className="min-h-tap justify-center rounded-button px-3 active:bg-surface"
              onPress={() => confirmRevoke(invite)}
            >
              <Text className="font-semibold text-body text-danger">Revoke</Text>
            </Pressable>
          </View>
        ))}
      </Card>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </View>
  );
}
