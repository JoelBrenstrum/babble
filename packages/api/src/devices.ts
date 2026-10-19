import { formatAgo } from '@babble/domain';
import { decodeBase64Url, signOut } from './auth';
import type { BabbleClient } from './client';
import { browserDeviceName } from './device-link';
import { MAX_DEVICE_NAME } from './device-name';
import { unwrap, unwrapVoid } from './errors';

export interface FamilyDevice {
  sessionId: string;
  userId: string;
  memberName: string;
  name: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActive: string;
  current: boolean;
}

export async function listFamilyDevices(client: BabbleClient, familyId: string): Promise<FamilyDevice[]> {
  const rows = unwrap(await client.rpc('family_devices', { target_family_id: familyId }));
  return rows.map((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    memberName: row.member_name,
    name: row.name ?? null,
    userAgent: row.user_agent ?? null,
    createdAt: row.created_at,
    lastActive: row.last_active,
    current: row.is_current,
  }));
}

export async function renameDevice(client: BabbleClient, sessionId: string, name: string): Promise<void> {
  unwrapVoid(await client.rpc('rename_device', { target_session_id: sessionId, new_name: name.trim() }));
}

export async function signOutDevice(client: BabbleClient, sessionId: string): Promise<void> {
  unwrapVoid(await client.rpc('sign_out_device', { target_session_id: sessionId }));
}

export async function signOutThisDevice(client: BabbleClient, sessionId: string): Promise<void> {
  // Best effort: the session may already be revoked, and this device must sign out regardless.
  await signOutDevice(client, sessionId).catch(() => undefined);
  await signOut(client);
}

export const DEVICES_SHOWN = 8;

export function shownDevices<T>(devices: readonly T[], expanded: boolean): { shown: T[]; hidden: number } {
  if (expanded || devices.length <= DEVICES_SHOWN) return { shown: [...devices], hidden: 0 };
  return { shown: devices.slice(0, DEVICES_SHOWN), hidden: devices.length - DEVICES_SHOWN };
}

export function signOutDeviceMessage(
  device: Pick<FamilyDevice, 'name' | 'userAgent' | 'memberName' | 'current'>,
): string {
  if (device.current) return 'Sign out of babble on this device?';
  return `Sign out ${familyDeviceLabel(device).text} (${device.memberName})? It stops working within the hour.`;
}

export function deviceNameError(name: string): string | null {
  return name.trim().length > MAX_DEVICE_NAME ? `Use ${MAX_DEVICE_NAME} characters or fewer for the name.` : null;
}

export function currentSessionId(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(accessToken.split('.')[1]!)) as { session_id?: unknown };
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

export function automaticDeviceName(userAgent: string | null | undefined): string {
  const agent = userAgent ?? '';
  if (/CFNetwork|Darwin/.test(agent)) return /iPad/.test(agent) ? 'iPad app' : 'iPhone app';
  if (/okhttp/i.test(agent)) return 'Android app';
  return browserDeviceName(agent);
}

export function familyDeviceLabel(device: Pick<FamilyDevice, 'name' | 'userAgent'>): { text: string; named: boolean } {
  return device.name
    ? { text: device.name, named: true }
    : { text: automaticDeviceName(device.userAgent), named: false };
}

export type DeviceNameSync = { kind: 'none' } | { kind: 'upload'; name: string } | { kind: 'store'; name: string };

export function deviceNameSync(serverName: string | null, localName: string): DeviceNameSync {
  const local = localName.trim();
  if (serverName === null) return local ? { kind: 'upload', name: local } : { kind: 'none' };
  return serverName === local ? { kind: 'none' } : { kind: 'store', name: serverName };
}

export function deviceDetail(device: Pick<FamilyDevice, 'memberName' | 'lastActive' | 'current'>, now: Date): string {
  const active = device.current
    ? 'This device'
    : `Active ${formatAgo(Math.max(0, now.getTime() - Date.parse(device.lastActive)))}`;
  return `${device.memberName} · ${active}`;
}
