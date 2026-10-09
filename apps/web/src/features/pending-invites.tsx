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
import { Ticket } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';

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
  const invites = useQuery(pendingInvitesQuery(client, family.id)).data ?? [];
  const names = useMemo(
    () => new Map(family.members.map((member) => [member.user_id, member.display_name])),
    [family.members],
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke(invite: PendingInvite) {
    setError(null);
    setRevoking(true);
    try {
      await revokeInvite(client, invite.id);
      setConfirming(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(family.id) });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setRevoking(false);
    }
  }

  if (invites.length === 0) return null;
  const now = new Date();

  return (
    <Card className="divide-y divide-line" role="list" aria-label="Pending invites">
      {invites.map((invite) => (
        <div key={invite.id} role="listitem" className="flex flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-grid size-9 place-items-center rounded-full bg-surface text-ink-2">
              <Ticket className="size-5" strokeWidth={2.5} />
            </span>
            <div className="flex-1">
              <div className="tabular text-row-title font-semibold tracking-wider">{invite.code}</div>
              <div className="text-meta text-ink-2">{pendingInviteMeta(invite, names, now)}</div>
            </div>
            {confirming !== invite.id && (
              <Button
                variant="ghost"
                className="text-danger"
                aria-label={`Revoke invite ${invite.code}`}
                onClick={() => {
                  setError(null);
                  setConfirming(invite.id);
                }}
              >
                Revoke
              </Button>
            )}
          </div>
          {confirming === invite.id && (
            <div className="flex flex-col gap-3 rounded-tile bg-danger-soft p-4">
              <p className="text-meta text-on-danger">Revoke this invite? The code will stop working.</p>
              <div className="flex gap-3">
                <Button variant="destructive" loading={revoking} onClick={() => revoke(invite)}>
                  Revoke
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
              </div>
              {error && <StatusMessage tone="danger">{error}</StatusMessage>}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
