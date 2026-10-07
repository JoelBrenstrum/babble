import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountChanged } from '@babble/api';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useBabble } from './babble';

interface ActiveBaby {
  familyId: string | null;
  babyId: string | null;
}

interface ActiveBabyContextValue extends ActiveBaby {
  loaded: boolean;
  select: (next: { familyId: string; babyId: string }) => void;
}

const KEY = 'babble.activeBaby';
const ActiveBabyContext = createContext<ActiveBabyContextValue | null>(null);

export function ActiveBabyProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveBaby>({ familyId: null, babyId: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => value && setActive(JSON.parse(value) as ActiveBaby))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const { session, sessionLoaded } = useBabble();
  const userId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!sessionLoaded) return;
    const nextUserId = session?.user.id ?? null;
    if (accountChanged(userId.current, nextUserId)) {
      setActive({ familyId: null, babyId: null });
      void AsyncStorage.removeItem(KEY).catch(() => undefined);
    }
    userId.current = nextUserId;
  }, [session, sessionLoaded]);

  const select = useCallback((next: { familyId: string; babyId: string }) => {
    setActive(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  return <ActiveBabyContext.Provider value={{ ...active, loaded, select }}>{children}</ActiveBabyContext.Provider>;
}

export function useActiveBaby(): ActiveBabyContextValue {
  const value = useContext(ActiveBabyContext);
  if (!value) throw new Error('useActiveBaby must be used inside ActiveBabyProvider');
  return value;
}
