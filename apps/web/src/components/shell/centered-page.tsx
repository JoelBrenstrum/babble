import type { ReactNode } from 'react';
import { Wordmark } from '#/components/ui/wordmark';

export function CenteredPage({ step, children }: { step?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-6 py-5">
        <Wordmark className="text-[28px]" />
        {step && <span className="text-meta font-semibold text-ink-3">{step}</span>}
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12 pt-4 sm:pt-12">{children}</main>
    </div>
  );
}
