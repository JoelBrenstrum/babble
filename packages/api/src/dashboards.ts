import { defaultDashboard, parseDashboardLayout, type DashboardLayout } from '@babble/domain';
import type { BabbleClient } from './client';
import type { Database, Json } from './database.types';

type DashboardRow = Database['public']['Tables']['dashboards']['Row'];
import { unwrapMaybe, unwrapVoid } from './errors';

export async function getDashboard(client: BabbleClient, familyId: string): Promise<DashboardLayout> {
  const row = unwrapMaybe<DashboardRow>(
    await client.from('dashboards').select('*').eq('family_id', familyId).maybeSingle(),
  );
  return (row && parseDashboardLayout(row.layout)) || defaultDashboard();
}

export async function saveDashboard(client: BabbleClient, familyId: string, layout: DashboardLayout): Promise<void> {
  unwrapVoid(
    await client
      .from('dashboards')
      .upsert({ family_id: familyId, layout: layout as unknown as NonNullable<Json> }, { onConflict: 'family_id' }),
  );
}

let subscriptionCount = 0;

export function subscribeToDashboard(client: BabbleClient, familyId: string, onChange: () => void): () => void {
  subscriptionCount += 1;
  const channel = client
    .channel(`dashboards:${familyId}:${subscriptionCount}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'dashboards', filter: `family_id=eq.${familyId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
