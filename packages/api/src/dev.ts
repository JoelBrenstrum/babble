// Seeded by packages/db/supabase/seed.sql into the local database only.
export const DEV_ACCOUNTS = [
  { name: 'John', role: 'owner', email: 'john@babble.dev', plan: 'plus' },
  { name: 'Jane', role: 'caregiver', email: 'jane@babble.dev', plan: 'plus' },
  { name: 'Sam', role: 'owner', email: 'sam@babble.dev', plan: 'free' },
] as const;

export const DEV_PASSWORD = 'password';
