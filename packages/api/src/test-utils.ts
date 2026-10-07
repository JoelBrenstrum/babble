import { createBabbleClient } from './client';

export interface RecordedRequest {
  url: URL;
  method: string;
  body: unknown;
}

export function fakeClient(respond: (request: RecordedRequest) => { status?: number; body: unknown }) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request: RecordedRequest = {
      url: new URL(input instanceof Request ? input.url : input.toString()),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' && init.body ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const { status = 200, body } = respond(request);
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  const client = createBabbleClient(
    { supabaseUrl: 'https://babble.test', supabaseAnonKey: 'anon' },
    { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  return { client, requests };
}
