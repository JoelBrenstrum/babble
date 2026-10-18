import { parsePublicConfig } from '@babble/config';
import { createFileRoute } from '@tanstack/react-router';
import { homeAssistantConfig } from '#/lib/home-assistant-server';

export const Route = createFileRoute('/api/ha/v1/config')({
  server: {
    handlers: {
      GET: () => homeAssistantConfig(parsePublicConfig(process.env)),
    },
  },
});
