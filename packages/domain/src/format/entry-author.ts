import { formatShortDate, formatTimeOfDay } from '../time/local-time';

export function entryAuthorText(options: {
  author?: string;
  createdAt: string;
  updatedAt: string;
  timeZone: string;
  imported: boolean;
  timer?: boolean;
}): string {
  const when = `${formatShortDate(options.createdAt, options.timeZone)}, ${formatTimeOfDay(options.createdAt, options.timeZone)}`;
  const who = options.imported
    ? 'Imported'
    : `${options.timer ? 'Started' : 'Logged'} by ${options.author ?? 'a former member'}`;
  const edited = Date.parse(options.updatedAt) - Date.parse(options.createdAt) > 60_000 ? ' · edited' : '';
  return `${who} · ${when}${edited}`;
}

export function entryEndedText(options: {
  endedBy?: string;
  endRecordedAt: string | null;
  startedAt: string;
  timeZone: string;
}): string | null {
  if (!options.endRecordedAt) return null;
  const time = formatTimeOfDay(options.endRecordedAt, options.timeZone);
  const date = formatShortDate(options.endRecordedAt, options.timeZone);
  const day = date === formatShortDate(options.startedAt, options.timeZone) ? '' : ` on ${date}`;
  return `Ended by ${options.endedBy ?? 'a former member'}${day} at ${time}`;
}
