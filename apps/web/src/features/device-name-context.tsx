import { type BabbleClient } from '@babble/api';
import { useCurrentDeviceName, useDeviceNameSync } from '@babble/api/react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { localDeviceName } from '#/lib/device-name';

export interface DeviceNameState {
  name: string;
  setName: (name: string) => void;
  error: string | null;
}

const DeviceNameContext = createContext<DeviceNameState | null>(null);

export function DeviceNameProvider({
  client,
  familyId,
  children,
}: {
  client: BabbleClient;
  familyId: string;
  children: ReactNode;
}) {
  useDeviceNameSync(client, familyId, localDeviceName);
  const state = useCurrentDeviceName(client, familyId, localDeviceName);
  return <DeviceNameContext.Provider value={state}>{children}</DeviceNameContext.Provider>;
}

export function useDeviceName(): DeviceNameState {
  const shared = useContext(DeviceNameContext);
  const [name, setLocalName] = useState(localDeviceName.read);
  return (
    shared ?? {
      name,
      setName: (next) => {
        setLocalName(next);
        localDeviceName.write(next);
      },
      error: null,
    }
  );
}
