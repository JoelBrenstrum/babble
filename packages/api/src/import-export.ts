import { isEventType, type HuckleberryImport } from '@babble/domain';
import { EXPORT_FORMAT, EXPORT_VERSION } from './export';
import { readExportedDraft } from './exported-draft';

export class BabbleExportError extends Error {}

export interface ExportedBaby {
  name: string;
  birthDate: string | null;
  timezone: string | null;
  result: HuckleberryImport;
}

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

export function looksLikeJson(fileText: string): boolean {
  return fileText.trimStart().startsWith('{');
}

export function readBabbleExport(fileText: string): ExportedBaby[] {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new BabbleExportError('That file is not valid JSON.');
  }
  if (!isRecord(data) || data.format !== EXPORT_FORMAT) {
    throw new BabbleExportError('This does not look like a babble export.');
  }
  if (data.version !== EXPORT_VERSION) {
    throw new BabbleExportError('This export is from a different version of babble and cannot be imported here.');
  }
  if (!Array.isArray(data.babies) || data.babies.length === 0) {
    throw new BabbleExportError('This export has no babies in it.');
  }
  return data.babies.map((entry) => {
    const baby = isRecord(entry) && isRecord(entry.baby) ? entry.baby : {};
    const events = isRecord(entry) && Array.isArray(entry.events) ? entry.events : [];
    return {
      name: text(baby.name) ?? 'Baby',
      birthDate: text(baby.birthDate),
      timezone: text(baby.timezone),
      result: exportedEvents(events),
    };
  });
}

export function exportedEvents(events: readonly unknown[]): HuckleberryImport {
  const result: HuckleberryImport = { events: [], skipped: [], warnings: [] };
  events.forEach((raw, index) => {
    const line = index + 1;
    const event = isRecord(raw) ? raw : {};
    const type = text(event.type) ?? 'unknown';
    const id = text(event.id);
    if (!id || !isEventType(type) || !text(event.startedAt)) {
      result.skipped.push({ line, type, reason: 'Not an entry babble recognises' });
    } else if (event.deletedAt) {
      result.skipped.push({ line, type, reason: 'Deleted before the export' });
    } else if (!event.endedAt) {
      result.skipped.push({ line, type, reason: 'Still running when exported' });
    } else {
      const draft = readExportedDraft(event);
      if (draft) result.events.push({ ...draft, sourceRef: id, line });
      else result.skipped.push({ line, type, reason: 'Not in a format babble recognises' });
    }
  });
  return result;
}
