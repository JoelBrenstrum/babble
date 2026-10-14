import { createFileRoute } from '@tanstack/react-router';
import { adminClient, pollDeviceLink } from '#/lib/device-link-server';

export const Route = createFileRoute('/api/device-link/poll')({
  server: {
    handlers: {
      POST: ({ request }) => pollDeviceLink(adminClient(), request),
    },
  },
});
