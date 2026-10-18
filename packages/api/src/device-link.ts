import type { BabbleClient } from './client';
import { toBabbleError, unwrap, unwrapVoid } from './errors';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;
const VALID_CODE = /^[2-9A-HJ-NP-Z]{8}$/;

export const DEVICE_LINK_POLL_MS = 2500;

export type DeviceLinkStatus = 'pending' | 'approved' | 'expired';

export interface DeviceLinkStart {
  id: string;
  code: string;
  secret: string;
  expiresAt: string;
}

export interface DeviceLinkDetails {
  device: string;
  expiresAt: string;
}

export function newDeviceLinkCode(randomBytes: (length: number) => Uint8Array = randomValues): string {
  return Array.from(randomBytes(CODE_LENGTH), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function newDeviceLinkSecret(randomBytes: (length: number) => Uint8Array = randomValues): string {
  return Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomValues(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function normalizeDeviceLinkCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function isValidDeviceLinkCode(input: string): boolean {
  return VALID_CODE.test(normalizeDeviceLinkCode(input));
}

export function formatDeviceLinkCode(code: string): string {
  const compact = normalizeDeviceLinkCode(code);
  return compact.length === CODE_LENGTH ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export function deviceLinkUrl(publicUrl: string, code: string): string {
  return `${publicUrl}/link/${normalizeDeviceLinkCode(code)}`;
}

const BROWSERS: [RegExp, string][] = [
  [/HomeAssistant\//, 'Home Assistant'],
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Chromium\//, 'Chromium'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'Mac'],
  [/Linux/, 'Linux'],
];

function parseUserAgent(userAgent: string | null | undefined) {
  const agent = userAgent ?? '';
  return {
    browser: BROWSERS.find(([pattern]) => pattern.test(agent))?.[1],
    system: SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1],
  };
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const { browser, system } = parseUserAgent(userAgent);
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? 'A web browser';
}

export function browserDeviceName(userAgent: string | null | undefined): string {
  const { browser, system } = parseUserAgent(userAgent);
  if (browser && system) return `${system} (${browser})`;
  return system ?? browser ?? 'Web browser';
}

export async function getDeviceLinkDetails(client: BabbleClient, code: string): Promise<DeviceLinkDetails | null> {
  const [row] = unwrap(await client.rpc('device_link_details', { link_code: normalizeDeviceLinkCode(code) }));
  return row ? { device: row.device, expiresAt: row.expires_at } : null;
}

export async function approveDeviceLink(client: BabbleClient, code: string): Promise<void> {
  unwrapVoid(await client.rpc('approve_device_link', { link_code: normalizeDeviceLinkCode(code) }));
}

export async function finishDeviceLink(client: BabbleClient, tokenHash: string): Promise<void> {
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw toBabbleError(error);
}
