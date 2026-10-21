import { LoaderCircle } from 'lucide-react';
import { cn } from '#/lib/cn';
import { reloadPage } from '#/lib/reload';
import { useStalled } from '#/lib/use-stalled';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      role="status"
      aria-label={label}
      className={cn('size-5 animate-spin motion-reduce:animate-none', className)}
      strokeWidth={2.75}
    />
  );
}

export function PageSpinner({ label = 'Loading', onReload = reloadPage }: { label?: string; onReload?: () => void }) {
  const stalled = useStalled();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg text-primary">
      <span className="font-brand text-[32px]">babble</span>
      <Spinner className="size-7" label={label} />
      {stalled && (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <p className="text-meta text-ink-2">This is taking longer than usual.</p>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex h-tap items-center justify-center rounded-button border border-line bg-raised px-4 text-body font-semibold text-ink hover:bg-surface"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}

export function SectionSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex justify-center py-16 text-primary">
      <Spinner className="size-7" label={label} />
    </div>
  );
}
