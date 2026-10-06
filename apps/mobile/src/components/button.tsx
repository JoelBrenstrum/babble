import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const container: Record<Variant, string> = {
  primary: 'bg-primary active:bg-on-primary-soft',
  secondary: 'bg-raised border border-line active:bg-surface',
  ghost: 'bg-transparent active:bg-surface',
  destructive: 'bg-danger active:opacity-90',
};

const label: Record<Variant, string> = {
  primary: 'text-on-primary',
  secondary: 'text-ink',
  ghost: 'text-ink-2',
  destructive: 'text-ink-on-solid',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className,
  ...props
}: Omit<PressableProps, 'children'> & {
  variant?: Variant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: string;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-button px-5 ${size === 'lg' ? 'min-h-tap-lg' : 'min-h-tap'} ${container[variant]} ${disabled ? 'opacity-45' : ''} ${className ?? ''}`}
      {...props}
    >
      {loading ? <ActivityIndicator /> : icon}
      <Text className={`font-semibold ${size === 'lg' ? 'text-row-title' : 'text-body'} ${label[variant]}`}>
        {children}
      </Text>
    </Pressable>
  );
}
