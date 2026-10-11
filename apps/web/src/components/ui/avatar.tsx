import { toneFor, type MemberTone, type MemberToneMap } from '@babble/domain';
import { createContext, useContext } from 'react';
import { cn } from '#/lib/cn';

const TONE_CLASSES: Record<MemberTone, string> = {
  'person-1': 'bg-person-1-soft text-on-person-1',
  'person-2': 'bg-person-2-soft text-on-person-2',
  'person-3': 'bg-person-3-soft text-on-person-3',
  'person-4': 'bg-person-4-soft text-on-person-4',
};

const MemberTonesContext = createContext<MemberToneMap>(new Map());
export const MemberTonesProvider = MemberTonesContext.Provider;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = toneFor(name, useContext(MemberTonesContext));
  return (
    <span
      title={name}
      data-tone={tone}
      className={cn(
        'inline-grid size-9 place-items-center rounded-full text-label font-bold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
