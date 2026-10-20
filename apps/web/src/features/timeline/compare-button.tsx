import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { cn } from '#/lib/cn';

export function CompareButton({
  comparing,
  label,
  locked,
  plus,
  onPress,
}: {
  comparing: boolean;
  label: string;
  locked: boolean;
  plus: boolean;
  onPress: () => void;
}) {
  const title = comparing ? 'Stop comparing' : label;
  return (
    <button
      type="button"
      aria-pressed={comparing}
      aria-label={title}
      title={title}
      onClick={onPress}
      className={cn(
        'relative grid size-tap place-items-center rounded-full',
        comparing ? 'bg-primary text-ink-on-solid' : 'bg-surface text-ink hover:bg-line',
      )}
    >
      <ArrowLeftRight className="size-5" strokeWidth={2.75} />
      {plus && locked && (
        <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <Sparkles aria-hidden className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
