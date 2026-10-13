import { X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ModalSheet } from '#/components/ui/modal-sheet';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';

export function Sheet({
  title,
  icon: Icon,
  tone,
  onClose,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ModalSheet variant="chair" label={title} onClose={onClose}>
      <div className="flex flex-none items-center gap-[3cqmin]">
        <span className={cn('grid size-[12cqmin] place-items-center rounded-full', tone)}>
          <Icon className="size-[6.4cqmin]" strokeWidth={2.5} />
        </span>
        <span className="flex-1 text-[length:8cqmin] font-bold">{title}</span>
        <BigButton label="Close" onClick={onClose} className="size-[18.4cqmin] rounded-full bg-surface">
          <X className="size-[7cqmin]" strokeWidth={2.75} />
        </BigButton>
      </div>
      {children}
    </ModalSheet>
  );
}
