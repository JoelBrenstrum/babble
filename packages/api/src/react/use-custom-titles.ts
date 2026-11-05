import { customTitleSuggestions, hasCustomTitle, normaliseCustomTitle, recentCustomTitles } from '@babble/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BabbleClient } from '../client';
import { addCustomTitle, removeCustomTitle } from '../custom-titles';
import { customTitlesQuery, eventListQuery, queryKeys } from '../queries';

const NO_TITLES: string[] = [];

export function useCustomTitleMutations(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.customTitles(babyId);
  const current = () => queryClient.getQueryData<string[]>(key) ?? NO_TITLES;
  const settle = () => queryClient.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: (text: string) => addCustomTitle(client, babyId, text),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = current();
      const title = normaliseCustomTitle(text);
      if (title && !hasCustomTitle(previous, title)) queryClient.setQueryData(key, [...previous, title]);
      return { previous };
    },
    onError: (_error, _text, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (title: string) => removeCustomTitle(client, babyId, title),
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = current();
      queryClient.setQueryData(
        key,
        previous.filter((existing) => existing !== title),
      );
      return { previous };
    },
    onError: (_error, _title, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: settle,
  });

  return { add, remove };
}

export function useCustomTitles(client: BabbleClient, babyId: string, { enabled = true } = {}) {
  const saved = useQuery({ ...customTitlesQuery(client, babyId), enabled }).data ?? NO_TITLES;
  const history = useQuery({ ...eventListQuery(client, babyId, ['custom']), enabled }).data;
  const suggestions = customTitleSuggestions(saved, recentCustomTitles(history ?? []));
  return { saved, suggestions, ...useCustomTitleMutations(client, babyId) };
}
