import { toneFor, type MemberTone, type MemberToneMap } from '@babble/domain';
import { createContext, useContext } from 'react';
import { cn } from '#/lib/cn';

const TONE_CLASSES: Record<MemberTone, string> = {
  secondary: 'bg-secondary-soft text-on-secondary-soft',
  growth: 'bg-growth-soft text-on-growth',
  sleep: 'bg-sleep-soft text-on-sleep',
  info: 'bg-info-soft text-on-info',
  pump: 'bg-pump-soft text-on-pump',
  bottle: 'bg-bottle-soft text-on-bottle',
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
