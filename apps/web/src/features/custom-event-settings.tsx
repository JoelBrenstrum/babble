import type { BabbleClient } from '@babble/api';
import { useCustomTitles } from '@babble/api/react';
import { canSaveCustomTitle, MAX_CUSTOM_TITLE_LENGTH, MAX_SAVED_CUSTOM_TITLES } from '@babble/domain';
import { Plus, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';

export function CustomEventSettings({
  client,
  babyId,
  disabled,
}: {
  client: BabbleClient;
  babyId: string;
  disabled: boolean;
}) {
  const { saved, add, remove } = useCustomTitles(client, babyId);
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const error = add.error ?? remove.error;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSaveCustomTitle(saved, typed)) return;
    const text = typed;
    setTyped('');
    add.mutate(text, { onError: () => setTyped((current) => current || text) });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-row-title font-semibold">Custom event suggestions</h3>
        <p className="text-meta text-ink-2">
          Shown as quick picks when you log a custom event, like a medicine or bath. Titles you've used recently show
          too.
        </p>
      </div>
      <fieldset disabled={disabled} className="flex flex-col gap-4 disabled:opacity-60">
        <ul className="flex flex-wrap gap-2" aria-label="Saved suggestions">
          {saved.map((title) => (
            <li
              key={title}
              className="inline-flex h-11 items-center gap-1 rounded-chip border border-line bg-raised pr-1 pl-4 text-label text-ink"
            >
              {title}
              <button
                type="button"
                aria-label={`Remove ${title}`}
                onClick={() => remove.mutate(title)}
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </li>
          ))}
          {saved.length === 0 && <li className="text-meta text-ink-2">No saved suggestions.</li>}
        </ul>
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Add a suggestion
          </label>
          <input
            id={inputId}
            value={typed}
            maxLength={MAX_CUSTOM_TITLE_LENGTH}
            placeholder="Add a suggestion"
            onChange={(event) => setTyped(event.target.value)}
            className="h-tap min-w-0 flex-1 rounded-button border border-line-strong bg-raised px-4 text-body text-ink placeholder:text-ink-3"
          />
          <Button type="submit" variant="secondary" disabled={!canSaveCustomTitle(saved, typed)}>
            <Plus className="size-5" strokeWidth={2.75} />
            Add
          </Button>
        </form>
        {saved.length >= MAX_SAVED_CUSTOM_TITLES && (
          <p className="text-meta text-ink-2">You can keep up to {MAX_SAVED_CUSTOM_TITLES} suggestions.</p>
        )}
      </fieldset>
      {error && <StatusMessage tone="danger">{error.message}</StatusMessage>}
    </Card>
  );
}
