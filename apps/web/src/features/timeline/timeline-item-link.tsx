import type { BabyEvent } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '#/lib/cn';
import { blockTouchMenu, NO_CALLOUT } from '#/lib/touch-menu';

export function TimelineItemLink({
  event,
  running,
  label,
  className,
  style,
  children,
}: {
  event: BabyEvent;
  running: boolean;
  label: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <Link
      to={running ? '/sessions/$eventId' : '/events/$eventId'}
      params={{ eventId: event.id }}
      aria-label={label}
      title={label}
      className={cn(className, NO_CALLOUT)}
      onContextMenu={blockTouchMenu}
      style={style}
    >
      {children}
    </Link>
  );
}
