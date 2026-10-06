import { familiesQuery, resolveOnboarding, type OnboardingStep } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { useBabble } from './babble';

export function useOnboarding(): { loading: boolean; state: OnboardingStep | null; error: Error | null } {
  const { client, session, sessionLoaded } = useBabble();
  const families = useQuery({ ...familiesQuery(client), enabled: Boolean(session) });

  if (!sessionLoaded) return { loading: true, state: null, error: null };
  if (!session) return { loading: false, state: resolveOnboarding({ signedIn: false, families: [] }), error: null };
  if (families.isPending) return { loading: true, state: null, error: null };
  if (families.error) return { loading: false, state: null, error: families.error };
  return { loading: false, state: resolveOnboarding({ signedIn: true, families: families.data }), error: null };
}

export function useReadyState() {
  const { state } = useOnboarding();
  if (state?.step !== 'ready') return null;
  return state;
}
