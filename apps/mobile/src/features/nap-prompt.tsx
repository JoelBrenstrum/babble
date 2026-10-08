import { clock, endSession, queryKeys, startSession, toBabbleError, type BabbleClient } from '@babble/api';
import { napPromptContent, type NapAction, type NapPrompt } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Moon } from 'lucide-react-native';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast';
import { useTokenColor } from '@/lib/theme';

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
  const [pending, setPending] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const moonColor = useTokenColor('--on-sleep');
  const feedColor = useTokenColor('--on-feed-right');
  const content = prompt ? napPromptContent(prompt, babyName, timeZone, clock.now()) : null;

  function close() {
    setPrompt(null);
    setPending(null);
  }

  async function choose(label: string, action: NapAction) {
    if (!action) return close();
    setPending(label);
    try {
      if (action.kind === 'end-nap') await endSession(client, action.napId, action.at);
      else if (action.kind === 'end-feed') await endSession(client, action.feedId, action.at);
      else await startSession(client, babyId, 'sleep', 'left', action.at);
      await queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId), refetchType: 'all' });
      close();
    } catch (error) {
      toast({ message: toBabbleError(error).message });
      setPending(null);
    }
  }

  return (
    <NapPromptContext.Provider value={setPrompt}>
      {children}
      <Modal visible={content !== null} transparent animationType="slide" onRequestClose={close}>
        <Pressable accessibilityLabel="Close" className="flex-1 bg-scrim/40" onPress={close} />
        {content && (
          <SafeAreaView edges={['bottom']} className="gap-4 rounded-t-sheet bg-raised px-5 pb-4 pt-3">
            <View className="h-1.5 w-10 self-center rounded-full bg-line-strong" />
            <View className="flex-row items-center gap-3">
              {prompt?.kind === 'end-feed' ? (
                <View className="size-11 items-center justify-center rounded-full bg-feed-right-soft">
                  <Heart size={20} color={feedColor} strokeWidth={2.75} />
                </View>
              ) : (
                <View className="size-11 items-center justify-center rounded-full bg-sleep-soft">
                  <Moon size={20} color={moonColor} strokeWidth={2.75} />
                </View>
              )}
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
