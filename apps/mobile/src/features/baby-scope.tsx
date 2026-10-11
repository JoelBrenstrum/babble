import { memberTones } from '@babble/domain';
import { useMemo, type ReactNode } from 'react';
import { MemberTonesProvider } from '@/components/avatar';
import { useBabble } from '@/lib/babble';
import { useAutoEndStaleSessions, useRealtimeEvents } from '@/lib/use-events';
import { useReadyState } from '@/lib/use-onboarding';
import { NapPromptProvider } from './nap-prompt';

export function BabyScope({ children }: { children: ReactNode }) {
  const ready = useReadyState();
  const { client } = useBabble();
  const members = ready?.family.members;
  const tones = useMemo(() => memberTones(members ?? []), [members]);
  if (!ready) return <>{children}</>;
  return (
    <MemberTonesProvider value={tones}>
      <NapPromptProvider
        client={client}
        babyId={ready.baby.id}
        babyName={ready.baby.name}
        timeZone={ready.baby.timezone}
      >
        <BabyEffects babyId={ready.baby.id} />
        {children}
      </NapPromptProvider>
    </MemberTonesProvider>
  );
}

function BabyEffects({ babyId }: { babyId: string }) {
  const { client } = useBabble();
  useRealtimeEvents(client, babyId);
  useAutoEndStaleSessions(client, babyId);
  return null;
}
