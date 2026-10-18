import { createFileRoute } from '@tanstack/react-router';
import { babyState, withConnection } from '#/lib/home-assistant-server';

export const Route = createFileRoute('/api/ha/v1/babies/$babyId/state')({
  server: {
    handlers: {
      GET: ({ request, params }) => withConnection(request, (connection) => babyState(connection, params.babyId)),
    },
  },
});
