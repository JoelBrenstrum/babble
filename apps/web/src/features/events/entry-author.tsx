import { entryAuthorText } from '@babble/domain';
import { Avatar } from '#/components/ui/avatar';

export function EntryAuthor(props: Parameters<typeof entryAuthorText>[0]) {
  return (
    <p className="flex items-center gap-2 text-meta text-ink-2">
      {props.author && !props.imported && <Avatar name={props.author} className="size-7 text-caption" />}
      {entryAuthorText(props)}
    </p>
  );
}
