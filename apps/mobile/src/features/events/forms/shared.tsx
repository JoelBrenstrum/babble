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
