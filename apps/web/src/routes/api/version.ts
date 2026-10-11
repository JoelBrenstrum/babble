import { createFileRoute } from '@tanstack/react-router';
import { RELEASE_ID } from '#/lib/release';

export const Route = createFileRoute('/api/version')({
  server: {
    handlers: {
      GET: () => Response.json({ release: RELEASE_ID }, { headers: { 'cache-control': 'no-store' } }),
    },
  },
});
