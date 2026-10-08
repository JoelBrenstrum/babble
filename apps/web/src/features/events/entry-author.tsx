import { entryAuthorText, entryEndedText } from '@babble/domain';
import { Avatar } from '#/components/ui/avatar';

export function EntryAuthor({
  ended,
  ...props
}: Parameters<typeof entryAuthorText>[0] & { ended?: Parameters<typeof entryEndedText>[0] }) {
  const endedText = ended ? entryEndedText(ended) : null;
  return (
    <div className="flex flex-col gap-1 text-meta text-ink-2">
      <p className="flex items-center gap-2">
        {props.author && !props.imported && <Avatar name={props.author} className="size-7 text-caption" />}
        {entryAuthorText(props)}
      </p>
      {endedText && <p>{endedText}</p>}
    </div>
  );
}
