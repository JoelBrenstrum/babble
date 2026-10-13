import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type AppStateSubscribe = (listener: (state: AppStateStatus) => void) => () => void;

export const subscribeAppState: AppStateSubscribe = (listener) => {
  const subscription = AppState.addEventListener('change', listener);
  return () => subscription.remove();
};

export function focusEventListener(subscribe: AppStateSubscribe = subscribeAppState) {
  return (handleFocus: (focused?: boolean) => void) => subscribe((state) => handleFocus(state === 'active'));
}

export function onForeground(listener: () => void, subscribe: AppStateSubscribe = subscribeAppState): () => void {
  return subscribe((state) => {
    if (state === 'active') listener();
  });
}

export function useForegroundCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => onForeground(() => setCount((current) => current + 1)), []);
  return count;
}
