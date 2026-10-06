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
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}
