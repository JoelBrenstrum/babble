import { ChevronRight } from 'lucide-react';
import { Card, SectionLabel } from '#/components/ui/card';
import { LEGAL_PATHS } from './legal-contact';
import { linkClass } from './legal-page';

export function AgreementNote() {
  return (
    <p className="mt-8 text-center text-meta text-ink-3">
      By continuing you agree to the{' '}
      <a href={LEGAL_PATHS.terms} className={linkClass}>
        Terms of use
      </a>{' '}
      and{' '}
      <a href={LEGAL_PATHS.privacy} className={linkClass}>
        Privacy policy
      </a>
      .
    </p>
  );
}

const ABOUT_LINKS = [
  { label: 'Privacy policy', href: LEGAL_PATHS.privacy },
  { label: 'Terms of use', href: LEGAL_PATHS.terms },
];

export function AboutSection() {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>About</SectionLabel>
      <Card className="divide-y divide-line">
        {ABOUT_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex min-h-tap items-center justify-between px-5 py-4 text-row-title font-semibold hover:bg-surface"
          >
            {link.label}
            <ChevronRight className="size-5 text-ink-3" strokeWidth={2.75} />
          </a>
        ))}
      </Card>
    </section>
  );
}
