import type { PlusFeature } from '@babble/config';
import { Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';

export function PlusMask({
  locked = true,
  feature,
  title,
  body,
  children,
}: {
  locked?: boolean;
  feature: PlusFeature;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!locked) return children;
  return (
    <div className="relative min-h-80">
      <div aria-hidden inert className="pointer-events-none select-none opacity-60 blur-[6px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center px-2 pt-10">
        <Card className="flex max-w-sm flex-col items-center gap-3 p-6 text-center shadow-sheet">
          <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
            <Sparkles className="size-5" strokeWidth={2.75} />
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-row-title font-semibold">{title}</h2>
            <PlusBadge />
          </div>
          <p className="text-meta text-ink-2">{body}</p>
          <Button onClick={() => setOpen(true)}>See what Plus adds</Button>
        </Card>
      </div>
      {open && <PlusDialog feature={feature} onClose={() => setOpen(false)} />}
    </div>
  );
}
