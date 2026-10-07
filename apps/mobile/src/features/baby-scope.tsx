import type { ReactNode } from 'react';
import { useBabble } from '@/lib/babble';
import { useAutoEndStaleSessions, useRealtimeEvents } from '@/lib/use-events';
import { useReadyState } from '@/lib/use-onboarding';
import { NapPromptProvider } from './nap-prompt';

export function BabyScope({ children }: { children: ReactNode }) {
  const ready = useReadyState();
  const { client } = useBabble();
  if (!ready) return <>{children}</>;
  return (
    <NapPromptProvider client={client} babyId={ready.baby.id} babyName={ready.baby.name} timeZone={ready.baby.timezone}>
      <BabyEffects babyId={ready.baby.id} />
      {children}
    </NapPromptProvider>
  );
}

function BabyEffects({ babyId }: { babyId: string }) {
  const { client } = useBabble();
  useRealtimeEvents(client, babyId);
  useAutoEndStaleSessions(client, babyId);
  return null;
}
