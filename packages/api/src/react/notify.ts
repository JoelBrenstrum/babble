import { createContext, createElement, useContext, type ReactNode } from 'react';

export interface Toast {
  message: string;
  action?: { label: string; run: () => void };
}

export type Notify = (toast: Toast) => void;

const NotifyContext = createContext<Notify>(() => undefined);

export function NotifyProvider({ notify, children }: { notify: Notify; children?: ReactNode }) {
  return createElement(NotifyContext.Provider, { value: notify }, children);
}

export function useNotify(): Notify {
  return useContext(NotifyContext);
}
