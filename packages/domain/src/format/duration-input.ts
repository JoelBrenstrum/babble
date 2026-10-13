export function splitDuration(ms: number): { minutes: number; seconds: number } {
  const totalSeconds = Math.round(ms / 1000);
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}

export function joinDuration(minutes: number, seconds: number): number {
  return (minutes * 60 + seconds) * 1000;
}

export function clampDurationPart(value: string, max: number): number {
  return Math.min(max, Math.max(0, Number(value.replace(/\D/g, '')) || 0));
}
