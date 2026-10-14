import { useState } from 'react';

export function useSettled<T>(value: T, settled: boolean): T {
  const [shown, setShown] = useState(value);
  if (settled && !Object.is(shown, value)) setShown(value);
  return settled ? value : shown;
}
