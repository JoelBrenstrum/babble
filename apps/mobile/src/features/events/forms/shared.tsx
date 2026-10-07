import type { DraftErrors, EventDraft, Units } from '@babble/domain';
import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface FormProps<D extends EventDraft> {
  draft: D;
  onChange: (draft: D) => void;
  errors: DraftErrors;
  timeZone: string;
  units: Units;
  isNew: boolean;
}

export function FormSection({ children }: { children: ReactNode }) {
  return <View className="gap-5">{children}</View>;
}

export function shiftDraftStart<D extends EventDraft>(draft: D, startedAt: string): D {
  const delta = Date.parse(startedAt) - Date.parse(draft.startedAt);
  const shift = (iso: string | null) => (iso ? new Date(Date.parse(iso) + delta).toISOString() : iso);
  const shifted = { ...draft, startedAt, endedAt: shift(draft.endedAt) };
  if ('segments' in shifted) {
    return {
      ...shifted,
      segments: shifted.segments.map((segment) => ({
        ...segment,
        startedAt: shift(segment.startedAt)!,
        endedAt: shift(segment.endedAt),
      })),
    } as D;
  }
  return shifted as D;
}

export function instantDraft<D extends EventDraft>(draft: D, at: string): D {
  return { ...draft, startedAt: at, endedAt: at };
}
