import type { BabyEvent } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '#/lib/cn';
import { blockTouchMenu, NO_CALLOUT } from '#/lib/touch-menu';

const LONG_PRESS_MS = 450;

export function TimelineItemLink({
  event,
  running,
  label,
  className,
  style,
  children,
  onTip,
}: {
  event: BabyEvent;
  running: boolean;
  label: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onTip?: (target: HTMLElement | null) => void;
}) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  return (
    <Link
      to={running ? '/sessions/$eventId' : '/events/$eventId'}
      params={{ eventId: event.id }}
      aria-label={label}
      className={cn(className, NO_CALLOUT)}
      onContextMenu={blockTouchMenu}
      style={style}
      onMouseEnter={(mouse) => onTip?.(mouse.currentTarget)}
      onMouseLeave={() => onTip?.(null)}
      onFocus={(focus) => onTip?.(focus.currentTarget)}
      onBlur={() => onTip?.(null)}
      onPointerDown={(pointer) => {
        longPressed.current = false;
        cancel();
        if (pointer.pointerType !== 'touch') return;
        const target = pointer.currentTarget;
        timer.current = window.setTimeout(() => {
          longPressed.current = true;
          onTip?.(target);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onClick={(click) => {
        if (!longPressed.current) return;
        click.preventDefault();
        longPressed.current = false;
      }}
    >
      {children}
    </Link>
  );
}
