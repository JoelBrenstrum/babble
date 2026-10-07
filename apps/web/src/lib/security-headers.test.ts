import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, SECURITY_HEADERS } from './security-headers';

describe('contentSecurityPolicy', () => {
  it('allows only our scripts, Supabase connections and no framing', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc123', supabaseUrl: 'https://xyz.supabase.co' });
    expect(policy).toContain("script-src 'self' 'nonce-abc123'");
    expect(policy).toContain("connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain('unsafe-eval');
  });

  it('uses plain websockets for a local Supabase', () => {
    expect(contentSecurityPolicy({ nonce: 'n', supabaseUrl: 'http://127.0.0.1:54321' })).toContain(
      "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
    );
  });
});

describe('SECURITY_HEADERS', () => {
  it('forbids framing and sniffing and keeps referrers private', () => {
    expect(SECURITY_HEADERS).toMatchObject({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
  });
});
