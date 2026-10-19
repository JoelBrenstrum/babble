import { eventToDraft, type BabyEvent } from '@babble/domain';
import { useEffect, useRef, useState } from 'react';

export function draftSignature(event: BabyEvent): string {
  return JSON.stringify(eventToDraft(event));
}

export function useFormFreshness(event: BabyEvent) {
  const [loaded, setLoaded] = useState(() => ({ signature: draftSignature(event), version: 0 }));
  const adoptNext = useRef(false);
  const current = draftSignature(event);

  useEffect(() => {
    if (adoptNext.current && current !== loaded.signature) {
      adoptNext.current = false;
      setLoaded((state) => ({ ...state, signature: current }));
    }
  }, [current, loaded.signature]);

  return {
    changedElsewhere: !adoptNext.current && current !== loaded.signature,
    version: loaded.version,
    markOwnSave: () => {
      adoptNext.current = true;
    },
    reload: () => setLoaded((state) => ({ signature: current, version: state.version + 1 })),
  };
}
