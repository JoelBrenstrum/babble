import type { ReactNode } from 'react';
import { Wordmark } from '#/components/ui/wordmark';

export function PublicHeader({ homeLink = false, children }: { homeLink?: boolean; children?: ReactNode }) {
  const wordmark = <Wordmark className="text-[28px]" />;
  return (
    <header className="flex items-center justify-between px-6 py-5">
      {homeLink ? (
        <a href="/" aria-label="babble home">
          {wordmark}
        </a>
      ) : (
        wordmark
      )}
      {children}
    </header>
  );
}
