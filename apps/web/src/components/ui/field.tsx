import { fromLocalInputValue, toLocalInputValue } from '@babble/domain';
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '#/lib/cn';
import { opensPicker, showNativePicker } from '#/lib/native-picker';

const controlClass =
  'h-tap w-full rounded-button border border-line-strong bg-raised px-4 text-body text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-help` : undefined}
        className={cn(controlClass, className)}
        {...props}
        onClick={(event) => {
          if (opensPicker(props.type)) showNativePicker(event.currentTarget);
          props.onClick?.(event);
        }}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} className={cn(controlClass, className)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

function FieldShell({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold text-ink">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-help`} className={cn('text-meta', error ? 'text-danger' : 'text-ink-2')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, 'h-auto min-h-24 py-3', className)}
        {...props}
      />
    </FieldShell>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  timeZone,
  error,
  hint,
}: FieldProps & { value: string; onChange: (iso: string) => void; timeZone: string }) {
  return (
    <TextField
      label={label}
      type="datetime-local"
      error={error}
      hint={hint}
      value={toLocalInputValue(value, timeZone)}
      onChange={(event) => {
        const iso = fromLocalInputValue(event.target.value, timeZone);
        if (iso) onChange(iso);
      }}
    />
  );
}
