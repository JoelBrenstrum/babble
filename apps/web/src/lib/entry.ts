export type SignedOutDestination = '/welcome' | '/sign-in';

export interface EntryEnvironment {
  signedIn: boolean;
  standalone: boolean;
  pendingInvite: string | null;
}

export function signedOutRedirect({
  signedIn,
  standalone,
  pendingInvite,
}: EntryEnvironment): SignedOutDestination | null {
  if (signedIn) return null;
  return standalone || pendingInvite ? '/sign-in' : '/welcome';
}
