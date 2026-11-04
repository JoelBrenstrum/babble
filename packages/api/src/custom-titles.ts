import { canSaveCustomTitle, normaliseCustomTitle } from '@babble/domain';
import type { BabbleClient } from './client';
import { BabbleError, toBabbleError, unwrap, unwrapVoid } from './errors';

export async function listCustomTitles(client: BabbleClient, babyId: string): Promise<string[]> {
  const rows = unwrap(
    await client.from('custom_event_titles').select('title').eq('baby_id', babyId).order('created_at').order('id'),
  );
  return rows.map((row) => row.title);
}

export async function addCustomTitle(
  client: BabbleClient,
  babyId: string,
  saved: readonly string[],
  text: string,
): Promise<void> {
  const title = normaliseCustomTitle(text);
  if (!canSaveCustomTitle(saved, title)) {
    if (!title) throw new BabbleError('Type a title to save it.', 'invalid_input');
    return;
  }
  const { error } = await client.from('custom_event_titles').insert({ baby_id: babyId, title });
  if (error && (error as { code?: string }).code !== '23505') throw toBabbleError(error);
}

export async function removeCustomTitle(client: BabbleClient, babyId: string, title: string): Promise<void> {
  unwrapVoid(await client.from('custom_event_titles').delete().eq('baby_id', babyId).eq('title', title));
}
