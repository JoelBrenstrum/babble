const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

export function opensPicker(type: string | undefined): boolean {
  return type !== undefined && PICKER_TYPES.has(type);
}

export function showNativePicker(input: HTMLInputElement): void {
  if (!window.matchMedia?.('(pointer: coarse)').matches) return;
  try {
    input.showPicker();
  } catch {
    // Older browsers lack showPicker, and it throws when the picker is already open.
  }
}
