import type { BabyEvent } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';

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
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
