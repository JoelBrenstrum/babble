import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BabbleClient } from '../client';
import { deviceNameError, deviceNameSync, renameDevice } from '../devices';
import { toBabbleError } from '../errors';
import { familyDevicesQuery, queryKeys } from '../queries';

export interface LocalDeviceName {
  read: () => string;
  write: (name: string) => void;
}

const SAVE_DELAY_MS = 700;

function useCurrentDevice(client: BabbleClient, familyId: string) {
  const devices = useQuery(familyDevicesQuery(client, familyId));
  return devices.data?.find((device) => device.current) ?? null;
}

export function useDeviceNameSync(client: BabbleClient, familyId: string, local: LocalDeviceName): void {
  const queryClient = useQueryClient();
  const current = useCurrentDevice(client, familyId);
  const sessionId = current?.sessionId;
  const serverName = current ? current.name : undefined;
  useEffect(() => {
    if (!sessionId || serverName === undefined) return;
    const sync = deviceNameSync(serverName, local.read());
    if (sync.kind === 'store') local.write(sync.name);
    if (sync.kind === 'upload') {
      void renameDevice(client, sessionId, sync.name)
        .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) }))
        .catch(() => undefined);
    }
  }, [client, familyId, local, queryClient, serverName, sessionId]);
}

export function useCurrentDeviceName(client: BabbleClient, familyId: string, local: LocalDeviceName) {
  const queryClient = useQueryClient();
  const current = useCurrentDevice(client, familyId);
  const [name, setNameState] = useState(local.read);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionId = current?.sessionId;
  const serverName = current?.name;

  useEffect(() => {
    if (serverName) setNameState(serverName);
  }, [serverName]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setName = useCallback(
    (next: string) => {
      setNameState(next);
      local.write(next);
      const problem = deviceNameError(next);
      setError(problem);
      clearTimeout(timer.current);
      if (problem || !sessionId) return;
      timer.current = setTimeout(() => {
        renameDevice(client, sessionId, next)
          .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) }))
          .catch((caught: unknown) => setError(toBabbleError(caught).message));
      }, SAVE_DELAY_MS);
    },
    [client, familyId, local, queryClient, sessionId],
  );

  return { name, setName, error };
}
