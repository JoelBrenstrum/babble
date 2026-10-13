import { DAY_MS } from '../time/constants';
import { parseDayKey } from '../time/local-time';
export function babyAgeLabel(birthDate: string, today: string): string {
  const days = daysBetween(birthDate, today);
  if (days < 0) return 'Not born yet';
  if (days === 0) return 'Born today';
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'} old`;
  if (days < 7 * 13) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    return rest === 0 ? `${weeks}w` : `${weeks}w ${rest}d`;
  }
  const months = monthsBetween(birthDate, today);
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths === 0 ? `${years} years` : `${years}y ${restMonths}m`;
}

function toUtcDay(isoDate: string): number {
  const { year, month, day } = parseDayKey(isoDate);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / DAY_MS);
}

function monthsBetween(from: string, to: string): number {
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  return (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
}
