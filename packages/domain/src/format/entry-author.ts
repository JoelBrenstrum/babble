import { formatShortDate, formatTimeOfDay } from '../time/local-time';

export function entryAuthorText(options: {
  author?: string;
  createdAt: string;
  updatedAt: string;
  timeZone: string;
  imported: boolean;
}): string {
  const when = `${formatShortDate(options.createdAt, options.timeZone)}, ${formatTimeOfDay(options.createdAt, options.timeZone)}`;
  const who = options.imported ? 'Imported' : `Logged by ${options.author ?? 'a former member'}`;
  const edited = Date.parse(options.updatedAt) - Date.parse(options.createdAt) > 60_000 ? ' · edited' : '';
  return `${who} · ${when}${edited}`;
}
