export const DEVICE_HEADER = 'x-babble-device';
export const MAX_DEVICE_NAME = 60;

export function deviceHeaderValue(name: string | null | undefined): string | null {
  const value = (name ?? '')
    .normalize('NFKD')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DEVICE_NAME)
    .trim();
  return value || null;
}

export function fetchWithDeviceName(deviceName: () => string | null, baseFetch: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const value = deviceHeaderValue(deviceName());
    if (!value) return baseFetch(input, init);
    const headers = new Headers(init?.headers);
    headers.set(DEVICE_HEADER, value);
    return baseFetch(input, { ...init, headers });
  };
}
