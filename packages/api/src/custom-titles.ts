import { customTitleEntry, type CustomTitle } from '@babble/domain';
import type { BabbleClient } from './client';
import { BabbleError, toBabbleError, unwrap, unwrapVoid } from './errors';

export async function listCustomTitles(client: BabbleClient, babyId: string): Promise<CustomTitle[]> {
  return unwrap(
    await client
      .from('custom_event_titles')
      .select('title, kind, unit')
      .eq('baby_id', babyId)
      .order('created_at')
      .order('id'),
  );
}

// The database rejects duplicates and enforces the limit, so this never trusts a possibly optimistic cached list.
export async function addCustomTitle(client: BabbleClient, babyId: string, entry: CustomTitle): Promise<void> {
  const { title, kind, unit } = customTitleEntry(entry.title, entry.kind, entry.unit);
  if (!title) throw new BabbleError('Type a title to save it.', 'invalid_input');
  if (kind === 'amount' && !unit) throw new BabbleError('Add a unit, like drops or ml.', 'invalid_input');
  const { error } = await client.from('custom_event_titles').insert({ baby_id: babyId, title, kind, unit });
  if (error && (error as { code?: string }).code !== '23505') throw toBabbleError(error);
}

export async function removeCustomTitle(client: BabbleClient, babyId: string, title: string): Promise<void> {
  unwrapVoid(await client.from('custom_event_titles').delete().eq('baby_id', babyId).eq('title', title));
}
