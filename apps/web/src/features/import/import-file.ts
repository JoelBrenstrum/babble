import { BabbleExportError, looksLikeJson, readBabbleExport, type ExportedBaby, type ImportSource } from '@babble/api';
import { HuckleberryCsvError, MAX_IMPORT_BYTES, parseHuckleberryCsv, type HuckleberryImport } from '@babble/domain';

export type ParsedImport =
  | { source: 'huckleberry_csv'; result: HuckleberryImport }
  | { source: 'babble_export'; babies: ExportedBaby[] }
  | { error: string };

export interface ReadyImport {
  source: ImportSource;
  result: HuckleberryImport;
}

export const importTooBig = (bytes: number): boolean => bytes > MAX_IMPORT_BYTES;

export function parseImportFile(text: string, timeZone: string): ParsedImport {
  try {
    if (looksLikeJson(text)) return { source: 'babble_export', babies: readBabbleExport(text) };
    return { source: 'huckleberry_csv', result: parseHuckleberryCsv(text, { timeZone }) };
  } catch (caught) {
    return {
      error:
        caught instanceof HuckleberryCsvError || caught instanceof BabbleExportError
          ? caught.message
          : 'That file could not be read.',
    };
  }
}

export function exportedBabies(parsed: ParsedImport | null): ExportedBaby[] | null {
  return parsed && 'babies' in parsed ? parsed.babies : null;
}

export function readyImport(parsed: ParsedImport | null, fromIndex: number): ReadyImport | null {
  if (!parsed || 'error' in parsed) return null;
  if (parsed.source === 'huckleberry_csv') return { source: parsed.source, result: parsed.result };
  const baby = parsed.babies[fromIndex] ?? parsed.babies[0];
  return baby ? { source: parsed.source, result: baby.result } : null;
}

export function spansFamilies(choices: readonly { familyId: string }[]): boolean {
  return new Set(choices.map((choice) => choice.familyId)).size > 1;
}

export function importProgressPercent(done: number, total: number): number {
  return (done / Math.max(1, total)) * 100;
}
