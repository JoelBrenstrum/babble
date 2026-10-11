import { toneFor, type MemberTone, type MemberToneMap } from '@babble/domain';
import { createContext, useContext } from 'react';
import { Text, View } from 'react-native';

const TONE_CLASSES: Record<MemberTone, { bg: string; text: string }> = {
  'person-1': { bg: 'bg-person-1-soft', text: 'text-on-person-1' },
  'person-2': { bg: 'bg-person-2-soft', text: 'text-on-person-2' },
  'person-3': { bg: 'bg-person-3-soft', text: 'text-on-person-3' },
  'person-4': { bg: 'bg-person-4-soft', text: 'text-on-person-4' },
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
