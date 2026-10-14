import { createFileRoute } from '@tanstack/react-router';
import { adminClient, startDeviceLink } from '#/lib/device-link-server';

export const Route = createFileRoute('/api/device-link/')({
  server: {
    handlers: {
      POST: ({ request }) => startDeviceLink(adminClient(), request),
    },
  },
});
