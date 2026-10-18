import { createFileRoute } from '@tanstack/react-router';
import { runAction, withConnection } from '#/lib/home-assistant-server';

export const Route = createFileRoute('/api/ha/v1/babies/$babyId/actions/$action')({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withConnection(request, (connection) => runAction(connection, params.babyId, params.action, request)),
    },
  },
});
