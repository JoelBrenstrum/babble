import { pendingInvitesQuery, type BabbleClient, type Family } from '@babble/api';
import { canInviteCarer } from '@babble/config';
import { roleLabel, type MemberRole } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { InvitePanel } from '@/features/invite-panel';
import { useCreateInvite } from '@/features/pending-invites';
import { RolePicker } from '@/features/role-picker';
import { useTokenColor } from '@/lib/theme';

type Step = { kind: 'closed' } | { kind: 'choose'; role: MemberRole } | { kind: 'created'; role: MemberRole };

export function InviteFlow({
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
  const muted = useTokenColor('--ink-2');

  if (step.kind === 'created') {
    return (
      <View className="gap-2">
        <Text className="text-center font-sans text-meta text-ink-2">{`Joins as ${roleLabel(step.role)}`}</Text>
        <InvitePanel publicUrl={publicUrl} onCreate={onCreate} />
      </View>
    );
  }

  if (step.kind === 'choose') {
    return (
      <Card className="gap-4 p-5">
        <Text className="font-semibold text-row-title text-ink">What can they do?</Text>
        <RolePicker value={step.role} onChange={(role) => setStep({ kind: 'choose', role })} />
        <View className="flex-row gap-3">
          <Button onPress={() => setStep({ kind: 'created', role: step.role })}>Create invite</Button>
          <Button variant="ghost" onPress={() => setStep({ kind: 'closed' })}>
            Cancel
          </Button>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={locked ? <Lock size={18} color={muted} strokeWidth={2.75} /> : undefined}
        accessibilityLabel={locked ? 'Invite someone, Babble Plus' : undefined}
        onPress={() => (locked ? setPitching(true) : setStep({ kind: 'choose', role: 'caregiver' }))}
      >
        Invite someone
      </Button>
      {locked && (
        <View className="flex-row items-center justify-center gap-2">
          <PlusBadge />
          <Text className="font-sans text-meta text-ink-2">Two carers on the free plan</Text>
        </View>
      )}
      <PlusDialog feature={pitching ? 'extra_carers' : null} onClose={() => setPitching(false)} />
    </>
  );
}
