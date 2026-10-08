import { cn } from '#/lib/cn';

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-brand text-primary', className)}>babble</span>;
}
