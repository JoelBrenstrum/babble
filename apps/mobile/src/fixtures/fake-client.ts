import type { BabbleClient } from '@babble/api';

export interface FakeClient {
  client: BabbleClient;
  rpc: jest.Mock;
  update: jest.Mock;
}

export function createFakeClient(): FakeClient {
  const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
  const update = jest.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
  const client = { rpc, from: () => ({ update }) } as unknown as BabbleClient;
  return { client, rpc, update };
}
