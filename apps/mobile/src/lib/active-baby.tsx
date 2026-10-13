import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseActiveBaby, type ActiveBabySelection as ActiveBaby } from '@babble/domain';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useBabble } from './babble';

interface ActiveBabyContextValue extends ActiveBaby {
  loaded: boolean;
  select: (next: { familyId: string; babyId: string }) => void;
}

const EMPTY: ActiveBaby = { familyId: null, babyId: null };
const KEY = 'babble.activeBaby';
const ActiveBabyContext = createContext<ActiveBabyContextValue | null>(null);

export function ActiveBabyProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveBaby>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => {
        const stored = parseActiveBaby(value);
        if (stored) setActive(stored);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const { accountEpoch } = useBabble();
  useEffect(() => {
    if (accountEpoch === 0) return;
    setActive(EMPTY);
    void AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, [accountEpoch]);

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
