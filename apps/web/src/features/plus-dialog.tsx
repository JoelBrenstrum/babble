import { plusPitch, type PlusFeature } from '@babble/config';
import { Check, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '#/components/ui/button';
import { cn } from '#/lib/cn';

export function PlusBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-chip bg-primary-soft px-2 py-0.5 text-caption font-bold text-on-primary-soft',
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3" strokeWidth={3} />
      Plus
    </span>
  );
}

export function PlusDialog({ feature, onClose }: { feature: PlusFeature; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const pitch = plusPitch(feature);

  useEffect(() => {
    close.current?.focus();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-scrim/40 md:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plus-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-sheet bg-raised p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-left shadow-sheet md:rounded-sheet md:pb-6"
      >
        <span className="mx-auto h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
            <Sparkles className="size-5" strokeWidth={2.75} />
          </span>
          <h2 id="plus-dialog-title" className="text-heading font-bold">
            Babble Plus
          </h2>
        </div>
        <p className="text-body text-ink-2">{pitch.reason}</p>
        <ul className="flex flex-col gap-2">
          {pitch.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2 text-body">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.75} />
              {highlight}
            </li>
          ))}
        </ul>
        <p className="text-meta text-ink-2">{pitch.note}</p>
        <Button ref={close} size="lg" variant="secondary" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>,
    document.body,
  );
}
