import { formatShortDate, formatTimeOfDay } from '../time/local-time';
import { MINUTE_MS } from '../time/constants';

export function entryAuthorText(options: {
  author?: string;
  device?: string | null;
  createdAt: string;
  updatedAt: string;
  timeZone: string;
  imported: boolean;
  timer?: boolean;
}): string {
  const when = `${formatShortDate(options.createdAt, options.timeZone)}, ${formatTimeOfDay(options.createdAt, options.timeZone)}`;
  const who = options.imported
    ? 'Imported'
    : `${options.timer ? 'Started' : 'Logged'} by ${options.author ?? 'a former member'}${options.device ? ` on ${options.device}` : ''}`;
  const edited = Date.parse(options.updatedAt) - Date.parse(options.createdAt) > MINUTE_MS ? ' · edited' : '';
  return `${who} · ${when}${edited}`;
}

export function entryEndedText(options: {
  endedBy?: string;
  device?: string | null;
  endRecordedAt: string | null;
  timeZone: string;
}): string | null {
  if (!options.endRecordedAt) return null;
  const when = `${formatShortDate(options.endRecordedAt, options.timeZone)}, ${formatTimeOfDay(options.endRecordedAt, options.timeZone)}`;
  return `Ended by ${options.endedBy ?? 'a former member'}${options.device ? ` on ${options.device}` : ''} · ${when}`;
}
