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
import { readStorage, storageKeys, writeStorage } from './storage';

export interface Babble {
  config: PublicConfig;
  client: BabbleClient;
}

export function parseSavedConfig(saved: string | null): PublicConfig | null {
  if (!saved) return null;
  try {
    const config = JSON.parse(saved) as Record<keyof PublicConfig, unknown> | null;
    if (!config) return null;
    const text = (value: unknown) => typeof value === 'string';
    const flag = (value: unknown) => typeof value === 'boolean';
    const optionalText = (value: unknown) => value === null || text(value);
    const valid =
      text(config.publicUrl) &&
      text(config.supabaseUrl) &&
      text(config.supabaseAnonKey) &&
      flag(config.billingEnabled) &&
      flag(config.googleAuthEnabled) &&
      flag(config.deviceSignInEnabled) &&
      optionalText(config.operatorName) &&
      optionalText(config.contactEmail);
    return valid ? (config as PublicConfig) : null;
  } catch {
    return null;
  }
}

function fetchConfig(): Promise<PublicConfig> {
  return getPublicConfig({ signal: timeoutSignal(FETCH_TIMEOUT_MS) }).then((config) => {
    writeStorage(storageKeys.publicConfig, JSON.stringify(config));
    return config;
  });
}

let babble: Promise<Babble> | null = null;

// A saved config lets the app start without waiting on the server; the fresh copy is used from the next start.
export function loadBabble(): Promise<Babble> {
  const saved = parseSavedConfig(readStorage(storageKeys.publicConfig));
  if (saved && !babble) void fetchConfig().catch(() => undefined);
  babble ??= (saved ? Promise.resolve(saved) : fetchConfig())
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
