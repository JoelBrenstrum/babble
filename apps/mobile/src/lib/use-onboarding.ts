import { babyChoices, familiesQuery, resolveOnboarding, type BabyChoice, type OnboardingStep } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { useActiveBaby } from './active-baby';
import { useBabble } from './babble';

export function useOnboarding(): {
  loading: boolean;
  state: OnboardingStep | null;
  error: Error | null;
  choices: BabyChoice[];
} {
  const { client, session, sessionLoaded } = useBabble();
  const active = useActiveBaby();
  const families = useQuery({ ...familiesQuery(client), enabled: Boolean(session) });

  if (!sessionLoaded || !active.loaded) return { loading: true, state: null, error: null, choices: [] };
  if (!session) {
    return { loading: false, state: resolveOnboarding({ signedIn: false, families: [] }), error: null, choices: [] };
  }
  if (families.isPending) return { loading: true, state: null, error: null, choices: [] };
  if (families.error) return { loading: false, state: null, error: families.error, choices: [] };
  return {
    loading: false,
    state: resolveOnboarding({
      signedIn: true,
      families: families.data,
      activeFamilyId: active.familyId,
      activeBabyId: active.babyId,
    }),
    error: null,
    choices: babyChoices(families.data),
  };
}

export function useReadyState() {
  const { state } = useOnboarding();
  if (state?.step !== 'ready') return null;
  return state;
}
