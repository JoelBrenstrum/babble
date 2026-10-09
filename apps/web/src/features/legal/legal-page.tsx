import type { ReactNode } from 'react';
import { Wordmark } from '#/components/ui/wordmark';
import { LEGAL_UPDATED, type LegalContact } from './legal-contact';

export const linkClass = 'font-semibold text-primary underline underline-offset-4';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="px-6 py-5">
        <a href="/" aria-label="babble home">
          <Wordmark className="text-[28px]" />
        </a>
      </header>
      <main className="mx-auto w-full max-w-prose px-4 pb-16 pt-4 sm:pt-10">
        <h1 className="text-title font-bold">{title}</h1>
        <p className="mt-2 text-meta text-ink-3">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 flex flex-col gap-8">{children}</div>
        <a href="/" className={`mt-12 inline-block text-meta ${linkClass}`}>
          Back to babble
        </a>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-body text-ink">
      <h2 className="text-row-title font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

export function ContactLine({ contact }: { contact: LegalContact }) {
  return contact.email ? (
    <>
      email{' '}
      <a href={`mailto:${contact.email}`} className={linkClass}>
        {contact.email}
      </a>
    </>
  ) : (
    <>talk to the person who invited you, or whoever runs this server</>
  );
}
