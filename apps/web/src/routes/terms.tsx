import { createFileRoute } from '@tanstack/react-router';
import { legalContact } from '#/features/legal/legal-contact';
import { TermsOfUse } from '#/features/legal/terms-of-use';

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms of use · babble' }] }),
  component: TermsPage,
});

function TermsPage() {
  const { babble } = Route.useRouteContext();
  return <TermsOfUse contact={legalContact(babble.config)} />;
}
