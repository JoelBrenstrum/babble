import { MINUTE_MS } from '../time/constants';
import { formatDuration } from './duration';

export function durationChange(current: number, previous: number): string {
  const delta = Math.round((current - previous) / MINUTE_MS) * MINUTE_MS;
  if (delta === 0) return 'Same';
  return `${delta > 0 ? '+' : '−'}${formatDuration(Math.abs(delta), { seconds: false })}`;
}

export function countChange(current: number, previous: number): string {
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return 'Same';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}
