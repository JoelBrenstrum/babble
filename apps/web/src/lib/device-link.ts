import { BabbleError, toBabbleError, type DeviceLinkStart, type DeviceLinkStatus } from '@babble/api';

export type DeviceLinkPoll =
  | { status: Exclude<DeviceLinkStatus, 'approved'> }
  | { status: 'approved'; tokenHash: string };

async function post<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (error) {
    throw toBabbleError(error);
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new BabbleError(data.error ?? toBabbleError(null).message, 'unknown');
  return data;
}

export function requestDeviceLink(): Promise<DeviceLinkStart> {
  return post('/api/device-link');
}

export function checkDeviceLink(link: Pick<DeviceLinkStart, 'id' | 'secret'>): Promise<DeviceLinkPoll> {
  return post('/api/device-link/poll', { id: link.id, secret: link.secret });
}

export function safeReturnPath(to: unknown): string {
  return typeof to === 'string' && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/\\') ? to : '/';
}
