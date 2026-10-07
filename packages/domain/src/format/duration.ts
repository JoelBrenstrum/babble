export function formatDuration(ms: number, options: { seconds?: boolean } = {}): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const showSeconds = options.seconds ?? hours === 0;

  if (hours > 0) return showSeconds ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return showSeconds ? `${minutes}m ${pad(seconds)}s` : `${minutes}m`;
  return showSeconds ? `${seconds}s` : '0m';
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatAgo(ms: number): string {
  if (ms < 60_000) return 'just now';
  return `${formatDuration(ms, { seconds: false })} ago`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
