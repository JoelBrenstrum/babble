import { plusPitch, type PlusFeature } from '@babble/config';
import { Check, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '#/components/ui/button';
import { ModalSheet } from '#/components/ui/modal-sheet';
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

  return (
    <ModalSheet labelledBy="plus-dialog-title" initialFocus={close} className="text-left" onClose={onClose}>
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
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled>
          <Sparkles className="size-5" strokeWidth={2.75} />
          Subscribe to Plus
        </Button>
        <p className="text-center text-meta text-ink-2">{pitch.note}</p>
        <Button ref={close} size="lg" variant="secondary" onClick={onClose}>
          Not now
        </Button>
      </div>
    </ModalSheet>
  );
}
