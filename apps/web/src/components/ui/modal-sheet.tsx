import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '#/lib/cn';

export type ModalSheetVariant = 'bottom' | 'chair';

const SCRIM: Record<ModalSheetVariant, string> = {
  bottom: 'fixed inset-0 z-40 flex items-end justify-center bg-scrim/40 md:items-center',
  chair: 'absolute inset-0 bg-scrim/55',
};

const PANEL: Record<ModalSheetVariant, string> = {
  bottom:
    'flex w-full max-w-md flex-col gap-4 rounded-t-sheet bg-raised p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-sheet outline-none md:rounded-sheet md:pb-6',
  chair:
    'absolute inset-x-[3cqmin] top-[5cqmin] bottom-[3cqmin] box-border flex flex-col gap-[3cqmin] rounded-[6cqmin] bg-raised p-[4cqmin] shadow-sheet outline-none',
};

export function ModalSheet({
  label,
  labelledBy,
  variant = 'bottom',
  portal = variant === 'bottom',
  initialFocus,
  className,
  onClose,
  children,
}: {
  label?: string;
  labelledBy?: string;
  variant?: ModalSheetVariant;
  portal?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    (initialFocus?.current ?? panel.current)?.focus();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && close.current();
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [initialFocus]);

  const sheet = (
    <div className={SCRIM[variant]} onMouseDown={() => close.current()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(PANEL[variant], className)}
      >
        {variant === 'bottom' && <span className="mx-auto h-1.5 w-10 rounded-full bg-line-strong md:hidden" />}
        {children}
      </div>
    </div>
  );
  return portal ? createPortal(sheet, document.body) : sheet;
}
