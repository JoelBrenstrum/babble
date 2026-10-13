import { pendingInvitesQuery, type BabbleClient, type Family } from '@babble/api';
import { canInviteCarer } from '@babble/config';
import { useQuery } from '@tanstack/react-query';
import { Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { InvitePanel } from '#/features/invite-panel';
import { useCreateInvite } from '#/features/pending-invites';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';

export function InviteToggle({
  client,
  family,
  billingEnabled,
  publicUrl,
}: {
  client: BabbleClient;
  family: Family;
  billingEnabled: boolean;
  publicUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [pitching, setPitching] = useState(false);
  const pending = useQuery(pendingInvitesQuery(client, family.id)).data ?? [];
  const onCreate = useCreateInvite(client, family.id);
  const locked = !canInviteCarer(billingEnabled, family.plan, family.members.length, pending.length);
  if (open) return <InvitePanel publicUrl={publicUrl} onCreate={onCreate} />;
  return (
    <>
      <Button
        variant="secondary"
        className={locked ? 'self-start text-ink-2' : 'self-start'}
        onClick={() => (locked ? setPitching(true) : setOpen(true))}
      >
        {locked ? <Lock className="size-5" strokeWidth={2.75} /> : <UserPlus className="size-5" strokeWidth={2.75} />}
        Invite a caregiver
        {locked && <PlusBadge />}
      </Button>
      {pitching && <PlusDialog feature="extra_carers" onClose={() => setPitching(false)} />}
    </>
  );
}
