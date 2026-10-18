import { createFileRoute } from '@tanstack/react-router';
import { listBabies, withConnection } from '#/lib/home-assistant-server';

export const Route = createFileRoute('/api/ha/v1/babies/')({
  server: {
    handlers: {
      GET: ({ request }) => withConnection(request, listBabies),
    },
  },
});
