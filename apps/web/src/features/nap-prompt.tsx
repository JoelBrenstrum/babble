import { endSession, queryKeys, startSession, toBabbleError, type BabbleClient } from '@babble/api';
import { formatTimeOfDay, type NapPrompt } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Moon } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '#/components/ui/button';
import { useToast } from '#/components/ui/toast';

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
  const [prompt, setPrompt] = useState<NapPrompt | null>(null);
  return (
    <NapPromptContext.Provider value={setPrompt}>
      {children}
      {prompt && (
        <NapPromptDialog
          prompt={prompt}
          client={client}
          babyId={babyId}
          babyName={babyName}
          timeZone={timeZone}
          onClose={() => setPrompt(null)}
        />
      )}
    </NapPromptContext.Provider>
  );
}

interface Choice {
  label: string;
  hint?: string;
  run?: () => Promise<unknown>;
  primary?: boolean;
}

export function napPromptChoices(
  prompt: NapPrompt,
  actions: { endNap: (at?: string) => Promise<unknown>; startNap: (at?: string) => Promise<unknown> },
  timeZone: string,
): { title: (name: string) => string; body: string; choices: Choice[] } {
  if (prompt.kind === 'end-nap') {
    const feedStart = formatTimeOfDay(prompt.feedStartedAt, timeZone);
    const startedJustNow = Date.now() - Date.parse(prompt.feedStartedAt) < 2 * 60_000;
    return {
      title: (name) => `End ${name}'s nap?`,
      body: `A nap has been running since ${formatTimeOfDay(prompt.nap.startedAt, timeZone)}.`,
      choices: [
        { label: 'End nap now', run: () => actions.endNap(), primary: true },
        ...(startedJustNow
          ? []
          : [{ label: `End at feed start (${feedStart})`, run: () => actions.endNap(prompt.feedStartedAt) }]),
        { label: 'Keep sleeping' },
      ],
    };
  }
  const feedEnd = formatTimeOfDay(prompt.feedEndedAt, timeZone);
  return {
    title: (name) => `Is ${name} asleep?`,
    body: 'Start a nap so the timer is already running when they wake.',
    choices: [
      { label: 'Start nap now', run: () => actions.startNap(), primary: true },
      { label: `Asleep since feed end (${feedEnd})`, run: () => actions.startNap(prompt.feedEndedAt) },
      { label: 'Not now' },
    ],
  };
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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  const { title, body, choices } = napPromptChoices(
    prompt,
    {
      endNap: (at) => endSession(client, prompt.kind === 'end-nap' ? prompt.nap.id : '', at),
      startNap: (at) => startSession(client, babyId, 'sleep', 'left', at),
    },
    timeZone,
  );

  async function choose(choice: Choice) {
    if (!choice.run) return onClose();
    setPending(choice.label);
    try {
      await choice.run();
      await queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId), refetchType: 'all' });
      onClose();
    } catch (error) {
      toast({ message: toBabbleError(error).message });
      setPending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-scrim/40 md:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nap-prompt-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-sheet bg-raised p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-sheet md:rounded-sheet md:pb-6"
      >
        <span className="mx-auto h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-sleep-soft text-on-sleep">
            <Moon className="size-5" strokeWidth={2.75} />
          </span>
          <h2 id="nap-prompt-title" className="text-heading font-bold">
            {title(babyName)}
          </h2>
        </div>
        <p className="text-body text-ink-2">{body}</p>
        <div className="flex flex-col gap-2">
          {choices.map((choice, index) => (
            <Button
              key={choice.label}
              ref={index === 0 ? firstButton : undefined}
              size="lg"
              variant={choice.primary ? 'primary' : choice.run ? 'secondary' : 'ghost'}
              loading={pending === choice.label}
              disabled={pending !== null && pending !== choice.label}
              onClick={() => choose(choice)}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
