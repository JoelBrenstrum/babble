import {
  clock,
  createInvite,
  pendingInvitesQuery,
  queryKeys,
  revokeInvite,
  type BabbleClient,
  type Family,
  type PendingInvite,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { membersHeading, pendingInviteMeta } from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { ConfirmPanel } from '#/components/ui/confirm-panel';

export function MembersLabel({
  client,
  familyId,
  editable,
}: {
  client: BabbleClient;
  familyId: string;
  editable: boolean;
}) {
  const invites = useQuery({ ...pendingInvitesQuery(client, familyId), enabled: editable }).data;
  return (
    <div className="flex items-center gap-2">
      <SectionLabel>{membersHeading(editable ? (invites?.length ?? 0) : 0)}</SectionLabel>
    </div>
  );
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
  const { run, busy: revoking, error, setError } = useAsyncAction();

  async function revoke(invite: PendingInvite) {
    const done = await run(async () => {
      await revokeInvite(client, invite.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(family.id) });
    });
    if (done) setConfirming(null);
  }

  if (invites.length === 0) return null;
  const now = clock.now();

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
            <ConfirmPanel
              message="Revoke this invite? The code will stop working."
              confirmLabel="Revoke"
              loading={revoking}
              error={error}
              onConfirm={() => void revoke(invite)}
              onCancel={() => setConfirming(null)}
            />
          )}
        </div>
      ))}
    </Card>
  );
}
