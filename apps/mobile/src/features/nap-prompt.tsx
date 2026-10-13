import { clock, isDataNapAction, type BabbleClient } from '@babble/api';
import { useNapAction } from '@babble/api/react';
import { napPromptContent, type NapAction, type NapPrompt } from '@babble/domain';
import { router } from 'expo-router';
import { Droplets, Heart, Moon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { useTokenColor } from '@/lib/theme';

const PROMPT_ICON = {
  nappy: { Icon: Droplets, background: 'bg-nappy-soft', token: '--on-nappy' },
  'end-feed': { Icon: Heart, background: 'bg-feed-right-soft', token: '--on-feed-right' },
  'end-nap': { Icon: Moon, background: 'bg-sleep-soft', token: '--on-sleep' },
  'start-nap': { Icon: Moon, background: 'bg-sleep-soft', token: '--on-sleep' },
} as const;

function PromptIcon({ kind }: { kind: NapPrompt['kind'] }) {
  const { Icon, background, token } = PROMPT_ICON[kind];
  const color = useTokenColor(token);
  return (
    <View className={`size-11 items-center justify-center rounded-full ${background}`}>
      <Icon size={20} color={color} strokeWidth={2.75} />
    </View>
  );
}

const NapPromptContext = createContext<(prompts: NapPrompt[]) => void>(() => undefined);

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
  const [queue, setQueue] = useState<NapPrompt[]>([]);
  const prompt = queue[0] ?? null;
  const show = useCallback((next: NapPrompt[]) => {
    if (next.length > 0) setQueue((current) => [...current, ...next]);
  }, []);
  const [pending, setPending] = useState<string | null>(null);
  const napAction = useNapAction(client, babyId);
  const content = prompt ? napPromptContent(prompt, babyName, timeZone, clock.now()) : null;

  function close() {
    setQueue((current) => current.slice(1));
    setPending(null);
  }

  async function choose(label: string, action: NapAction) {
    if (!action) return close();
    if (!isDataNapAction(action)) {
      close();
      return router.push('/track/nappy/new');
    }
    setPending(label);
    try {
      await napAction.mutateAsync(action);
      close();
    } catch {
      setPending(null);
    }
  }

  return (
    <NapPromptContext.Provider value={show}>
      {children}
      <Modal visible={content !== null} transparent animationType="slide" onRequestClose={close}>
        <Pressable accessibilityLabel="Close" className="flex-1 bg-scrim/40" onPress={close} />
        {content && (
          <SafeAreaView edges={['bottom']} className="gap-4 rounded-t-sheet bg-raised px-5 pb-4 pt-3">
            <View className="h-1.5 w-10 self-center rounded-full bg-line-strong" />
            <View className="flex-row items-center gap-3">
              {prompt && <PromptIcon kind={prompt.kind} />}
              <Text accessibilityRole="header" className="flex-1 font-bold text-heading text-ink">
                {content.title}
              </Text>
            </View>
            <Text className="font-sans text-body text-ink-2">{content.body}</Text>
            <View className="gap-2">
              {content.options.map((option) => (
                <Button
                  key={option.label}
                  size="lg"
                  variant={option.primary ? 'primary' : option.action ? 'secondary' : 'ghost'}
                  loading={pending === option.label}
                  disabled={pending !== null && pending !== option.label}
                  onPress={() => choose(option.label, option.action)}
                >
                  {option.label}
                </Button>
              ))}
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </NapPromptContext.Provider>
  );
}
