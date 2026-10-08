import { formatTimer } from './duration';

export const RESEND_COOLDOWN_MS = 60_000;

export interface ResendState {
  ready: boolean;
  label: string;
}

export function resendState(sentAt: number, now: number): ResendState {
  const left = Math.min(RESEND_COOLDOWN_MS, Math.max(0, RESEND_COOLDOWN_MS - (now - sentAt)));
  if (left === 0) return { ready: true, label: 'Resend link' };
  return { ready: false, label: `Resend in ${formatTimer(Math.ceil(left / 1000) * 1000)}` };
}
