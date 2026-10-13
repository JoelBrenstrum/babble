import { Link } from '@tanstack/react-router';
import { Eye, Lock, Tablet, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, buttonClassName } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { ModalSheet } from '#/components/ui/modal-sheet';
import { ChairPreview } from '#/features/landing/previews';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';

export function ChairModeCard({ locked, plusBadge }: { locked: boolean; plusBadge: boolean }) {
  const [previewing, setPreviewing] = useState(false);
  const [pitching, setPitching] = useState(false);
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-feed-left-soft text-on-feed-left">
          <Tablet className="size-4" strokeWidth={2.75} />
        </span>
        <h3 className="flex-1 text-row-title font-semibold">Chair mode</h3>
        {plusBadge && <PlusBadge />}
      </div>
      <p className="text-meta text-ink-2">
        A full-screen feed station for a tablet or touchscreen by the feeding chair, with giant buttons. It keeps the
        screen on and dims overnight.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPreviewing(true)}>
          <Eye className="size-5" strokeWidth={2.75} />
          Preview
        </Button>
        {locked ? (
          <Button variant="secondary" className="text-ink-2" onClick={() => setPitching(true)}>
            <Lock className="size-5" strokeWidth={2.75} />
            Open chair mode
          </Button>
        ) : (
          <Link to="/chair" className={buttonClassName({ variant: 'secondary' })}>
            <Tablet className="size-5" strokeWidth={2.75} />
            Open chair mode
          </Link>
        )}
      </div>
      {previewing && <ChairPreviewDialog onClose={() => setPreviewing(false)} />}
      {pitching && <PlusDialog feature="chair_mode" onClose={() => setPitching(false)} />}
    </Card>
  );
}

export function ChairPreviewDialog({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  return (
    <ModalSheet
      labelledBy="chair-preview-title"
      initialFocus={close}
      wide
      className="max-h-[92dvh] gap-4 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] md:p-6"
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 id="chair-preview-title" className="text-heading font-bold">
            Chair mode preview
          </h2>
          <p className="text-meta text-ink-2">
            An example with sample data. Start a side, switch or pause with one big tap, even holding a baby in the
            dark.
          </p>
        </div>
        <button
          ref={close}
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="grid size-tap shrink-0 place-items-center rounded-full bg-surface hover:bg-line"
        >
          <X className="size-5" strokeWidth={2.75} />
        </button>
      </div>
      <ChairPreview />
    </ModalSheet>
  );
}
