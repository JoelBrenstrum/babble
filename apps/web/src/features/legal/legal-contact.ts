import type { PublicConfig } from '@babble/config';

export const LEGAL_PATHS = { privacy: '/privacy', terms: '/terms' } as const;

export const LEGAL_UPDATED = '9 October 2026';

export const SOURCE_URL = 'https://github.com/JoelBrenstrum/babble';

export interface LegalContact {
  operator: string;
  email: string | null;
}

export function legalContact(config: Pick<PublicConfig, 'operatorName' | 'contactEmail'>): LegalContact {
  return {
    operator: config.operatorName ?? 'the people who run this babble server',
    email: config.contactEmail,
  };
}
