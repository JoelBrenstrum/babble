import { createFileRoute } from '@tanstack/react-router';
import { legalContact } from '#/features/legal/legal-contact';
import { PrivacyPolicy } from '#/features/legal/privacy-policy';

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy policy · babble' }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { babble } = Route.useRouteContext();
  return <PrivacyPolicy contact={legalContact(babble.config)} />;
}
