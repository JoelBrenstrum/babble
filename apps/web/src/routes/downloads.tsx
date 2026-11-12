import { createFileRoute } from '@tanstack/react-router';
import { Downloads } from '#/features/downloads';

export const Route = createFileRoute('/downloads')({
  head: () => ({ meta: [{ title: 'Get the app · babble' }] }),
  component: Downloads,
});
