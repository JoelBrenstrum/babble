import { parsePublicConfig, type PublicConfig } from '@babble/config';

export function readMobileConfig(): PublicConfig {
  return parsePublicConfig({
    PUBLIC_URL: process.env.EXPO_PUBLIC_PUBLIC_URL,
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_AUTH_ENABLED: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
    OPERATOR_NAME: process.env.EXPO_PUBLIC_OPERATOR_NAME,
    CONTACT_EMAIL: process.env.EXPO_PUBLIC_CONTACT_EMAIL,
  });
}

export const AUTH_REDIRECT = 'babble://auth/callback';
