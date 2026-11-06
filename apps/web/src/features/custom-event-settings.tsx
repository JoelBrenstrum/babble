import type { BabbleClient } from '@babble/api';
import { useCustomTitles } from '@babble/api/react';
import {
  canSaveCustomTitle,
  CUSTOM_KIND_LABELS,
  CUSTOM_KINDS,
  customTitleHint,
  MAX_CUSTOM_TITLE_LENGTH,
  MAX_CUSTOM_UNIT_LENGTH,
  MAX_SAVED_CUSTOM_TITLES,
  type CustomKind,
  type CustomTitle,
} from '@babble/domain';
import { Plus, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SingleChips } from '#/components/ui/chips';
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
  const [kind, setKind] = useState<CustomKind>('note');
  const [unit, setUnit] = useState('');
  const inputId = useId();
  const unitId = useId();
  const error = add.error ?? remove.error;
  const entry: CustomTitle = { title: typed, kind, unit };
  const canAdd = canSaveCustomTitle(saved, entry);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAdd) return;
    setTyped('');
    add.mutate(entry, { onError: () => setTyped((current) => current || entry.title) });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-row-title font-semibold">Custom event suggestions</h3>
        <p className="text-meta text-ink-2">
          Shown as quick picks when you log a custom event, like a medicine or bath. Each one can capture just the time,
          minutes, or an amount like drops.
        </p>
      </div>
      <fieldset disabled={disabled} className="flex flex-col gap-4 disabled:opacity-60">
        <ul className="flex flex-wrap gap-2" aria-label="Saved suggestions">
          {saved.map((item) => (
            <li
              key={item.title}
              className="inline-flex h-11 items-center gap-1 rounded-chip border border-line bg-raised pr-1 pl-4 text-label text-ink"
            >
              {item.title}
              <SavedHint entry={item} />
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() => remove.mutate(item.title)}
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </li>
          ))}
          {saved.length === 0 && <li className="text-meta text-ink-2">No saved suggestions.</li>}
        </ul>
        <SingleChips
          label="Captures"
          allowNone={false}
          options={CUSTOM_KINDS.map((value) => ({ value, label: CUSTOM_KIND_LABELS[value] }))}
          value={kind}
          onChange={setKind}
        />
        {kind === 'amount' && (
          <div className="flex flex-col gap-2">
            <label htmlFor={unitId} className="text-label font-semibold">
              Unit
            </label>
            <input
              id={unitId}
              value={unit}
              maxLength={MAX_CUSTOM_UNIT_LENGTH}
              placeholder="drops"
              onChange={(event) => setUnit(event.target.value)}
              className="h-tap rounded-button border border-line-strong bg-raised px-4 text-body text-ink placeholder:text-ink-3"
            />
          </div>
        )}
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
          <Button type="submit" variant="secondary" disabled={!canAdd}>
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

function SavedHint({ entry }: { entry: CustomTitle }) {
  const hint = customTitleHint(entry);
  return hint ? <span className="text-meta text-ink-2">· {hint}</span> : null;
}
