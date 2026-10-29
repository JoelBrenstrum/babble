import { Ellipsis } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '#/lib/cn';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function ReportMenu({ label, items, children }: { label: string; items: MenuItem[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-tap place-items-center rounded-full text-ink-2 hover:bg-surface hover:text-ink"
      >
        {children ?? <Ellipsis className="size-5" strokeWidth={2.75} />}
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-card bg-raised p-1 shadow-sheet"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex h-10 w-full items-center rounded-tile px-3 text-left text-body hover:bg-surface',
                  item.destructive && 'text-danger',
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
