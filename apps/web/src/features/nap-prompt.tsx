import { clock, isDataNapAction, type BabbleClient } from '@babble/api';
import { useNapAction } from '@babble/api/react';
import { napPromptContent, type NapAction, type NapPrompt } from '@babble/domain';
import { useNavigate } from '@tanstack/react-router';
import { Droplets, Heart, Moon, type LucideIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from '#/components/ui/button';
import { cn } from '#/lib/cn';
import { ModalSheet } from '#/components/ui/modal-sheet';

const PROMPT_ICON: Record<NapPrompt['kind'], { icon: LucideIcon; className: string }> = {
  nappy: { icon: Droplets, className: 'bg-nappy-soft text-on-nappy' },
  'end-feed': { icon: Heart, className: 'bg-feed-right-soft text-on-feed-right' },
  'end-nap': { icon: Moon, className: 'bg-sleep-soft text-on-sleep' },
  'start-nap': { icon: Moon, className: 'bg-sleep-soft text-on-sleep' },
};

const NapPromptContext = createContext<(prompt: NapPrompt | null) => void>(() => undefined);

export function useNapPrompt() {
  return useContext(NapPromptContext);
}

export function NapPromptProvider({
  client,
  babyId,
  babyName,
  timeZone,
  children,
}: {
  client: BabbleClient;
  babyId: string;
  babyName: string;
  timeZone: string;
  children: ReactNode;
}) {
  const [queue, setQueue] = useState<{ id: number; prompt: NapPrompt }[]>([]);
  const nextId = useRef(0);
  const show = useCallback((prompt: NapPrompt | null) => {
    if (!prompt) return;
    nextId.current += 1;
    const id = nextId.current;
    setQueue((current) => [...current, { id, prompt }]);
  }, []);
  const close = useCallback(() => setQueue((current) => current.slice(1)), []);
  const current = queue[0];
  return (
    <NapPromptContext.Provider value={show}>
      {children}
      {current && (
        <NapPromptDialog
          key={current.id}
          prompt={current.prompt}
          client={client}
          babyId={babyId}
          babyName={babyName}
          timeZone={timeZone}
          onClose={close}
        />
      )}
    </NapPromptContext.Provider>
  );
}

function NapPromptDialog({
  prompt,
  client,
  babyId,
  babyName,
  timeZone,
  onClose,
}: {
  prompt: NapPrompt;
  client: BabbleClient;
  babyId: string;
  babyName: string;
  timeZone: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const napAction = useNapAction(client, babyId);
  const [pending, setPending] = useState<string | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  const { title, body, options } = napPromptContent(prompt, babyName, timeZone, clock.now());
  const { icon: Icon, className: iconClass } = PROMPT_ICON[prompt.kind];

  async function choose(label: string, action: NapAction) {
    if (!action) return onClose();
    if (!isDataNapAction(action)) {
      onClose();
      return void navigate({ to: '/track/$type/new', params: { type: 'nappy' }, search: { then: 'back' } });
    }
    setPending(label);
    try {
      await napAction.mutateAsync(action);
      onClose();
    } catch {
      setPending(null);
    }
  }

  return (
    <ModalSheet labelledBy="nap-prompt-title" initialFocus={firstButton} onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className={cn('grid size-11 place-items-center rounded-full', iconClass)}>
          <Icon className="size-5" strokeWidth={2.75} />
        </span>
        <h2 id="nap-prompt-title" className="text-heading font-bold">
          {title}
        </h2>
      </div>
      <p className="text-body text-ink-2">{body}</p>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <Button
            key={option.label}
            ref={index === 0 ? firstButton : undefined}
            size="lg"
            variant={option.primary ? 'primary' : option.action ? 'secondary' : 'ghost'}
            loading={pending === option.label}
            disabled={pending !== null && pending !== option.label}
            onClick={() => choose(option.label, option.action)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </ModalSheet>
  );
}
