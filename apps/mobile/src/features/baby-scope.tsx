import { memberTones } from '@babble/domain';
import { useEffect, useMemo, type ReactNode } from 'react';
import { MemberTonesProvider } from '@/components/avatar';
import { useBabble } from '@/lib/babble';
import { refreshEvents, useAutoEndStaleSessions, useRealtimeEvents } from '@babble/api/react';
import { useQueryClient } from '@tanstack/react-query';
import { useForegroundCount } from '@/lib/foreground';
import { useCanLog } from '@/lib/use-can-log';
import { useReadyState } from '@/lib/use-onboarding';
import { NapPromptProvider } from './nap-prompt';

export function BabyScope({ children }: { children: ReactNode }) {
  const ready = useReadyState();
  const { client } = useBabble();
  const logging = useCanLog();
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
        enabled={logging}
      >
        <BabyEffects babyId={ready.baby.id} logging={logging} />
        {children}
      </NapPromptProvider>
    </MemberTonesProvider>
  );
}

function BabyEffects({ babyId, logging }: { babyId: string; logging: boolean }) {
  const { client } = useBabble();
  useRealtimeEvents(client, babyId);
  const queryClient = useQueryClient();
  const foregrounds = useForegroundCount();
  useAutoEndStaleSessions(client, babyId, { recheckKey: foregrounds, enabled: logging });
  useEffect(() => {
    if (foregrounds > 0) void refreshEvents(queryClient, babyId);
  }, [foregrounds, queryClient, babyId]);
  return null;
}
