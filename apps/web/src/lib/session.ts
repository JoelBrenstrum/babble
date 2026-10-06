import type { BabbleClient } from '@babble/api';
import type { Session } from '@supabase/supabase-js';
import { redirect } from '@tanstack/react-router';

export async function requireSession(client: BabbleClient): Promise<Session> {
  const { data } = await client.auth.getSession();
  if (!data.session) throw redirect({ to: '/sign-in', search: { invite: undefined } });
  return data.session;
}
