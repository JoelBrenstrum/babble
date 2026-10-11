export function parseKeepAwake(raw: string | null): boolean {
  return raw === 'on';
}

export function serialiseKeepAwake(on: boolean): string | null {
  return on ? 'on' : null;
}

export function keepAwakeHint(on: boolean, charging: boolean | null): string {
  if (!on) return 'Let the screen sleep as usual.';
  if (charging === true) return 'Stays on while this screen is open. Plugged in.';
  if (charging === false) return 'Stays on while this screen is open. On battery, so plug in if you can.';
  return 'Stays on while this screen is open.';
}
