export const fontFamilies = {
  sans: '"Figtree", system-ui, sans-serif',
  brand: '"Caprasimo", "Figtree", serif',
} as const;

export const nativeFontFamilies = {
  sans: ['Figtree'],
  medium: ['Figtree-Medium'],
  semibold: ['Figtree-SemiBold'],
  bold: ['Figtree-Bold'],
  brand: ['Caprasimo'],
} as const;

export interface TextStyle {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
}

export const fontSizes: Record<string, TextStyle> = {
  'timer-xl': { fontSize: '72px', lineHeight: '76px', letterSpacing: '-2px' },
  'timer-lg': { fontSize: '48px', lineHeight: '52px', letterSpacing: '-1px' },
  'timer-md': { fontSize: '28px', lineHeight: '32px', letterSpacing: '-0.5px' },
  title: { fontSize: '26px', lineHeight: '30px', letterSpacing: '-0.3px' },
  heading: { fontSize: '20px', lineHeight: '26px' },
  section: { fontSize: '13px', lineHeight: '16px', letterSpacing: '1px' },
  'row-title': { fontSize: '17px', lineHeight: '22px' },
  body: { fontSize: '16px', lineHeight: '23px' },
  meta: { fontSize: '14px', lineHeight: '19px' },
  label: { fontSize: '14px', lineHeight: '18px' },
  caption: { fontSize: '12px', lineHeight: '16px' },
};

export const spacing = { tap: '48px', 'tap-lg': '56px', 'tab-bar': '84px' } as const;

export const radii = { tile: '12px', button: '14px', card: '16px', sheet: '28px', chip: '9999px' } as const;

export const shadows = ['raised', 'sheet', 'toast'] as const;

export const durations = { fast: '120ms', base: '200ms', slow: '320ms' } as const;

export const timerPulse = '2400ms ease-out infinite';

export const shadcnColors = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary-foreground',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'sidebar',
  'sidebar-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
] as const;
