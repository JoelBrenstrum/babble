import type { ReactNode } from 'react';
import { Button } from './button';
import { StatusMessage } from './status';

export function ConfirmPanel({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  error,
  label,
  onConfirm,
  onCancel,
}: {
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role={label ? 'alertdialog' : undefined}
      aria-label={label}
      className="flex flex-col gap-3 rounded-tile bg-danger-soft p-4"
    >
      <p className="text-meta text-on-danger">{message}</p>
      <div className="flex gap-3">
        <Button variant="destructive" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </div>
  );
}
