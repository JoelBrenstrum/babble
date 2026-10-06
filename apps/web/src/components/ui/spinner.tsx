import { LoaderCircle } from 'lucide-react';
import { cn } from '#/lib/cn';

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

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg text-primary">
      <span className="font-brand text-[32px]">Babble</span>
      <Spinner className="size-7" label={label} />
    </div>
  );
}
