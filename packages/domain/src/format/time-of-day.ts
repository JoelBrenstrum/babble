export function minutesToClock(minutes: number, hourCycle: 'h12' | 'h23' = 'h12'): string {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalised / 60);
  const mins = String(normalised % 60).padStart(2, '0');
  if (hourCycle === 'h23') return `${String(hours).padStart(2, '0')}:${mins}`;
  const suffix = hours < 12 ? 'am' : 'pm';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${mins} ${suffix}`;
}

export function clockToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}
