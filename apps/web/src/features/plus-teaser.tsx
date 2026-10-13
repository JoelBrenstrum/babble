import type { PlusFeature } from '@babble/config';
import { Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';

export function PlusTeaser({ feature, title, children }: { feature: PlusFeature; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <Sparkles className="size-4" strokeWidth={2.75} />
        </span>
        <h2 className="flex-1 text-row-title font-semibold">{title}</h2>
        <PlusBadge />
      </div>
      <p className="text-meta text-ink-2">{children}</p>
      <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
        See what Plus adds
      </Button>
      {open && <PlusDialog feature={feature} onClose={() => setOpen(false)} />}
    </Card>
  );
}
