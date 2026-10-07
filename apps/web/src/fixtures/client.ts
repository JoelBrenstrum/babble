import { createBabbleClient } from '@babble/api';

export const fixtureClient = createBabbleClient(
  { supabaseUrl: 'http://fixtures.invalid', supabaseAnonKey: 'fixtures' },
  { auth: { persistSession: false, autoRefreshToken: false } },
);
