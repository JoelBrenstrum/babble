import type { ReactNode } from 'react';
import { PublicHeader } from './public-header';

export function CenteredPage({ step, children }: { step?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PublicHeader>{step && <span className="text-meta font-semibold text-ink-3">{step}</span>}</PublicHeader>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12 pt-4 sm:pt-12">{children}</main>
    </div>
  );
}
