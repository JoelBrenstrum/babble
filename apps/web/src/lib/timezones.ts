export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function listTimeZones(): string[] {
  return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [detectTimeZone()];
}
