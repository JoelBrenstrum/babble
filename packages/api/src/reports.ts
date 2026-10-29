import { parseReportSpec, type ReportSpec } from '@babble/domain';
import type { BabbleClient } from './client';
import type { Database, Json } from './database.types';

const toJson = (spec: ReportSpec) => spec as unknown as NonNullable<Json>;
import { BabbleError, unwrap, unwrapVoid } from './errors';

export type ReportRow = Database['public']['Tables']['reports']['Row'];

export interface SavedReport {
  id: string;
  familyId: string;
  name: string;
  spec: ReportSpec;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MAX_REPORT_NAME_LENGTH = 80;

export function reportNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the report a name.';
  if (trimmed.length > MAX_REPORT_NAME_LENGTH) return `Use ${MAX_REPORT_NAME_LENGTH} characters or fewer for the name.`;
  return null;
}

function validReportName(name: string): string {
  const error = reportNameError(name);
  if (error) throw new BabbleError(error, 'invalid_input');
  return name.trim();
}

export function rowToReport(row: ReportRow): SavedReport | null {
  const spec = parseReportSpec(row.spec);
  if (!spec) return null;
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    spec,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReports(client: BabbleClient, familyId: string): Promise<SavedReport[]> {
  const rows = unwrap(await client.from('reports').select('*').eq('family_id', familyId).order('created_at'));
  return rows.flatMap((row) => rowToReport(row) ?? []);
}

export async function createReport(
  client: BabbleClient,
  report: { familyId: string; name: string; spec: ReportSpec },
): Promise<SavedReport> {
  const name = validReportName(report.name);
  const userId = (await client.auth.getSession()).data.session?.user.id;
  if (!userId) throw new BabbleError('You need to sign in again.', 'not_signed_in');
  const row = unwrap(
    await client
      .from('reports')
      .insert({ family_id: report.familyId, name, spec: toJson(report.spec), created_by: userId })
      .select('*')
      .single(),
  );
  const saved = rowToReport(row);
  if (!saved) throw new BabbleError('The saved report could not be read back.', 'unknown');
  return saved;
}

export async function updateReport(
  client: BabbleClient,
  id: string,
  changes: { name?: string; spec?: ReportSpec },
): Promise<void> {
  const patch: Database['public']['Tables']['reports']['Update'] = {};
  if (changes.name !== undefined) patch.name = validReportName(changes.name);
  if (changes.spec) patch.spec = toJson(changes.spec);
  unwrapVoid(await client.from('reports').update(patch).eq('id', id));
}

export async function deleteReport(client: BabbleClient, id: string): Promise<void> {
  unwrapVoid(await client.from('reports').delete().eq('id', id));
}

let subscriptionCount = 0;

export function subscribeToReports(client: BabbleClient, familyId: string, onChange: () => void): () => void {
  subscriptionCount += 1;
  const channel = client
    .channel(`reports:${familyId}:${subscriptionCount}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports', filter: `family_id=eq.${familyId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
