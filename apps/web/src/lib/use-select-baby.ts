import type { BabyChoice } from '@babble/api';
import { useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { storageKeys, writeStorage } from './storage';

export function useSelectBaby(): (choice: BabyChoice) => void {
  const router = useRouter();
  return useCallback(
    (choice: BabyChoice) => {
      writeStorage(storageKeys.activeFamily, choice.familyId);
      writeStorage(storageKeys.activeBaby, choice.baby.id);
      void router.invalidate();
    },
    [router],
  );
}
