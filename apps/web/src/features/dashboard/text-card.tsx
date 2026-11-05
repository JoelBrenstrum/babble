import { MAX_TEXT_LENGTH } from '@babble/domain';
import { StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '#/components/ui/card';

const SAVE_DELAY_MS = 400;

export function TextCard({
  body,
  editing,
  onChange,
}: {
  body: string;
  editing: boolean;
  onChange?: (body: string) => void;
}) {
  const [draft, setDraft] = useState(body);
  useEffect(() => {
    if (draft === body || !onChange) return;
    const timer = setTimeout(() => onChange(draft), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, body, onChange]);
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-surface text-ink-2">
          <StickyNote className="size-4" strokeWidth={2.75} />
        </span>
        <h2 className="text-row-title font-semibold">Note</h2>
      </div>
      {editing && onChange ? (
        <textarea
          aria-label="Note"
          value={draft}
          maxLength={MAX_TEXT_LENGTH}
          rows={3}
          placeholder="Started formula top-ups 12 Oct"
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-tile border border-line-strong bg-raised px-3 py-2 text-body text-ink placeholder:text-ink-3"
        />
      ) : (
        <p className="whitespace-pre-wrap text-body text-ink-2">{body || 'Tap Arrange to write a note.'}</p>
      )}
    </Card>
  );
}
