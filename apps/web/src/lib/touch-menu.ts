import type { MouseEvent } from 'react';

export const NO_CALLOUT = 'select-none [-webkit-touch-callout:none]';

export function isTouchPress(pointerType: string | undefined, coarsePointer: boolean): boolean {
  if (pointerType) return pointerType === 'touch' || pointerType === 'pen';
  return coarsePointer;
}

export function blockTouchMenu(event: MouseEvent) {
  const { pointerType } = event.nativeEvent as Partial<PointerEvent>;
  if (isTouchPress(pointerType, window.matchMedia?.('(pointer: coarse)').matches ?? false)) event.preventDefault();
}
