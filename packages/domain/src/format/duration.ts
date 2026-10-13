import { DAY_MS, MINUTE_MS } from '../time/constants';

function clockParts(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function formatDuration(ms: number, options: { seconds?: boolean } = {}): string {
  const { hours, minutes, seconds } = clockParts(ms);
  const showSeconds = options.seconds ?? hours === 0;

  if (hours > 0) return showSeconds ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return showSeconds ? `${minutes}m ${pad(seconds)}s` : `${minutes}m`;
  return showSeconds ? `${seconds}s` : '0m';
}

export const formatDurationShort = (ms: number): string => formatDuration(ms, { seconds: false });

export function formatTimer(ms: number): string {
  const { hours, minutes, seconds } = clockParts(ms);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatAgo(ms: number): string {
  if (ms < MINUTE_MS) return 'just now';
  if (ms < DAY_MS) return `${formatDurationShort(ms)} ago`;
  const days = Math.floor(ms / DAY_MS);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export const formatPerDay = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1));

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
