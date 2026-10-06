import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type BabbleClient = SupabaseClient<Database>;

export function createBabbleClient(
  config: { supabaseUrl: string; supabaseAnonKey: string },
  options?: SupabaseClientOptions<'public'>,
): BabbleClient {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    ...options,
    auth: { flowType: 'pkce', ...options?.auth },
  });
}
