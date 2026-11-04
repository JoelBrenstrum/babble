import { describe, expect, it } from 'vitest';
import { addCustomTitle, listCustomTitles, removeCustomTitle } from './custom-titles';
import { fakeClient } from './test-utils';

describe('listCustomTitles', () => {
  it("lists a baby's saved titles oldest first", async () => {
    const { client, requests } = fakeClient(() => ({ body: [{ title: 'Bath' }, { title: 'Calpol' }] }));
    await expect(listCustomTitles(client, 'baby-1')).resolves.toEqual(['Bath', 'Calpol']);
    expect(requests[0]?.url.searchParams.get('baby_id')).toBe('eq.baby-1');
    expect(requests[0]?.url.searchParams.get('order')).toBe('created_at.asc,id.asc');
  });
});

describe('addCustomTitle', () => {
  it('saves a tidied title', async () => {
    const { client, requests } = fakeClient(() => ({ status: 201, body: [] }));
    await addCustomTitle(client, 'baby-1', ['Bath'], '  Calpol  2.5ml ');
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.body).toEqual({ baby_id: 'baby-1', title: 'Calpol 2.5ml' });
  });

  it('skips a title that is already saved', async () => {
    const { client, requests } = fakeClient(() => ({ status: 201, body: [] }));
    await addCustomTitle(client, 'baby-1', ['Calpol'], 'calpol');
    expect(requests).toHaveLength(0);
  });

  it('treats a title another carer just saved as saved', async () => {
    const { client } = fakeClient(() => ({ status: 409, body: { code: '23505', message: 'duplicate key' } }));
    await expect(addCustomTitle(client, 'baby-1', [], 'Calpol')).resolves.toBeUndefined();
  });

  it('explains the limit', async () => {
    const { client } = fakeClient(() => ({ status: 400, body: { code: 'PL009', message: 'limit' } }));
    await expect(addCustomTitle(client, 'baby-1', [], 'Calpol')).rejects.toMatchObject({ code: 'custom_title_limit' });
  });

  it('rejects an empty title', async () => {
    const { client } = fakeClient(() => ({ body: [] }));
    await expect(addCustomTitle(client, 'baby-1', [], '   ')).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('removeCustomTitle', () => {
  it('deletes the title for that baby', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await removeCustomTitle(client, 'baby-1', 'Walk');
    expect(requests[0]?.method).toBe('DELETE');
    expect(requests[0]?.url.searchParams.get('baby_id')).toBe('eq.baby-1');
    expect(requests[0]?.url.searchParams.get('title')).toBe('eq.Walk');
  });
});
