import { createBabbleClient, type BabbleClient } from '@babble/api';
import type { PublicConfig } from '@babble/config';
import { getPublicConfig } from './config';

export interface Babble {
  config: PublicConfig;
  client: BabbleClient;
}

let babble: Promise<Babble> | null = null;

export function loadBabble(): Promise<Babble> {
  babble ??= getPublicConfig().then((config) => ({
    config,
    client: createBabbleClient(config, { auth: { persistSession: true, detectSessionInUrl: false } }),
  }));
  return babble;
}
