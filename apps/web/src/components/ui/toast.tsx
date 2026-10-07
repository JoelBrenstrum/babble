import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(toast: Omit<Toast, 'id'>) => void>(() => undefined);

const DURATION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);

  const show = useCallback((next: Omit<Toast, 'id'>) => {
    nextId.current += 1;
    setToast({ ...next, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const timeout = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast, paused]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-tab-bar)+12px)] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            className="pointer-events-auto flex min-h-tap w-full max-w-md items-center gap-3 rounded-card bg-ink px-4 text-body text-bg shadow-toast"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="h-10 rounded-button px-3 font-bold text-primary-soft hover:bg-white/10"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
