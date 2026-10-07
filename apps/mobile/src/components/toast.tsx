import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onPress: () => void };
}

const ToastContext = createContext<(toast: Omit<Toast, 'id'>) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();

  const show = useCallback((next: Omit<Toast, 'id'>) => {
    nextId.current += 1;
    setToast({ ...next, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast, paused]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="box-none" className="absolute inset-x-0 px-4" style={{ bottom: insets.bottom + 96 }}>
          <Pressable
            accessibilityRole="alert"
            onPressIn={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            className="min-h-tap flex-row items-center gap-3 rounded-card bg-ink px-4 py-2"
          >
            <Text className="flex-1 font-sans text-body text-bg">{toast.message}</Text>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
                className="h-10 justify-center rounded-button px-3"
              >
                <Text className="font-bold text-body text-primary-soft">{toast.action.label}</Text>
              </Pressable>
            )}
          </Pressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
