import {
  createBabbleClient,
  FETCH_TIMEOUT_MS,
  fetchWithDeviceName,
  fetchWithTimeout,
  timeoutSignal,
  type BabbleClient,
} from '@babble/api';
import type { PublicConfig } from '@babble/config';
import { getPublicConfig } from './config';
import { currentDeviceName } from './device-name';

export interface Babble {
  config: PublicConfig;
  client: BabbleClient;
}

let babble: Promise<Babble> | null = null;

export function loadBabble(): Promise<Babble> {
  babble ??= getPublicConfig({ signal: timeoutSignal(FETCH_TIMEOUT_MS) })
    .then((config) => ({
      config,
      client: createBabbleClient(config, {
        auth: { persistSession: true, detectSessionInUrl: false },
        global: { fetch: fetchWithDeviceName(currentDeviceName, fetchWithTimeout()) },
      }),
    }))
    .catch((error: unknown) => {
      babble = null;
      throw error;
    });
  return babble;
}
