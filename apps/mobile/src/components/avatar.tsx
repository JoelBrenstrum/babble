import { toneFor, type MemberTone, type MemberToneMap } from '@babble/domain';
import { createContext, useContext } from 'react';
import { Text, View } from 'react-native';

const TONE_CLASSES: Record<MemberTone, { bg: string; text: string }> = {
  secondary: { bg: 'bg-secondary-soft', text: 'text-on-secondary-soft' },
  growth: { bg: 'bg-growth-soft', text: 'text-on-growth' },
  sleep: { bg: 'bg-sleep-soft', text: 'text-on-sleep' },
  info: { bg: 'bg-info-soft', text: 'text-on-info' },
  pump: { bg: 'bg-pump-soft', text: 'text-on-pump' },
  bottle: { bg: 'bg-bottle-soft', text: 'text-on-bottle' },
};

const MemberTonesContext = createContext<MemberToneMap>(new Map());
export const MemberTonesProvider = MemberTonesContext.Provider;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name }: { name: string }) {
  const tone = toneFor(name, useContext(MemberTonesContext));
  const classes = TONE_CLASSES[tone];
  return (
    <View
      accessibilityLabel={name}
      testID={`avatar-${tone}`}
      className={`size-9 items-center justify-center rounded-full border-2 border-bg ${classes.bg}`}
    >
      <Text className={`font-bold text-label ${classes.text}`}>{initials(name)}</Text>
    </View>
  );
}
