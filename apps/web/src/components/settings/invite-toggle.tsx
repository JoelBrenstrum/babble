import { pendingInvitesQuery, type BabbleClient, type Family } from '@babble/api';
import { canInviteCarer } from '@babble/config';
import { roleLabel, type MemberRole } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { RolePicker } from '#/components/settings/role-picker';
import { InvitePanel } from '#/features/invite-panel';
import { useCreateInvite } from '#/features/pending-invites';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';

type Step = { kind: 'closed' } | { kind: 'choosing'; role: MemberRole } | { kind: 'created'; role: MemberRole };

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
  const [step, setStep] = useState<Step>({ kind: 'closed' });
  const [pitching, setPitching] = useState(false);
  const pending = useQuery(pendingInvitesQuery(client, family.id)).data ?? [];
  const onCreate = useCreateInvite(client, family.id, step.kind === 'closed' ? 'caregiver' : step.role);
  const locked = !canInviteCarer(billingEnabled, family.plan, family.members.length, pending.length);

  if (step.kind === 'created') {
    return (
      <div className="flex flex-col gap-2">
        <InvitePanel publicUrl={publicUrl} onCreate={onCreate} />
        <p className="text-center text-meta text-ink-2">Joins as {roleLabel(step.role)}</p>
      </div>
    );
  }
  if (step.kind === 'choosing') {
    return (
      <Card className="flex flex-col gap-4 p-4">
        <h3 className="text-row-title font-semibold">What can they do?</h3>
        <RolePicker label="Joins as" value={step.role} onChange={(role) => setStep({ kind: 'choosing', role })} />
        <div className="flex gap-3">
          <Button onClick={() => setStep({ kind: 'created', role: step.role })}>Create invite</Button>
          <Button variant="ghost" onClick={() => setStep({ kind: 'closed' })}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }
  return (
    <>
      <Button
        variant="secondary"
        className={locked ? 'self-start text-ink-2' : 'self-start'}
        onClick={() => (locked ? setPitching(true) : setStep({ kind: 'choosing', role: 'caregiver' }))}
      >
        {locked ? <Lock className="size-5" strokeWidth={2.75} /> : <UserPlus className="size-5" strokeWidth={2.75} />}
        Invite someone
        {locked && <PlusBadge />}
      </Button>
      {pitching && <PlusDialog feature="extra_carers" onClose={() => setPitching(false)} />}
    </>
  );
}
