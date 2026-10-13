import { useCallback, useState } from 'react';
import { toBabbleError } from '../errors';

export interface AsyncAction {
  run: (task: () => Promise<unknown>) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export function useAsyncAction(): AsyncAction {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      return true;
    } catch (caught) {
      setError(toBabbleError(caught).message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { run, busy, error, setError };
}
