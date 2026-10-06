import { cn } from '#/lib/cn';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        'inline-grid size-9 place-items-center rounded-full bg-secondary-soft text-label font-bold text-on-secondary-soft',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
