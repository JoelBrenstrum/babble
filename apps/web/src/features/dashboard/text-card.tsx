import { MAX_TEXT_LENGTH } from '@babble/domain';
import { StickyNote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [draft, setDraft] = useState<string | null>(null);
  const save = (next: string) => {
    if (onChange && next !== body) onChange(next);
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (draft === null) return;
    if (draft === body) {
      setDraft(null);
      return;
    }
    const timer = setTimeout(() => saveRef.current(draft), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, body]);
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
          value={draft ?? body}
          maxLength={MAX_TEXT_LENGTH}
          rows={3}
          placeholder="Started formula top-ups 12 Oct"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => draft !== null && save(draft)}
          className="w-full rounded-tile border border-line-strong bg-raised px-3 py-2 text-body text-ink placeholder:text-ink-3"
        />
      ) : (
        <p className="whitespace-pre-wrap text-body text-ink-2">{body || 'Tap Arrange to write a note.'}</p>
      )}
    </Card>
  );
}
