import { customTitleEntry, hasCustomTitle, type CustomTitle } from '@babble/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BabbleClient } from '../client';
import { addCustomTitle, removeCustomTitle } from '../custom-titles';
import { customTitlesQuery, queryKeys } from '../queries';

const NO_TITLES: CustomTitle[] = [];

export function useCustomTitleMutations(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.customTitles(babyId);
  const current = () => queryClient.getQueryData<CustomTitle[]>(key) ?? NO_TITLES;
  const settle = () => queryClient.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: (entry: CustomTitle) => addCustomTitle(client, babyId, entry),
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = current();
      const tidied = customTitleEntry(entry.title, entry.kind, entry.unit);
      if (tidied.title && !hasCustomTitle(previous, tidied.title)) queryClient.setQueryData(key, [...previous, tidied]);
      return { previous };
    },
    onError: (_error, _entry, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (title: string) => removeCustomTitle(client, babyId, title),
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = current();
      queryClient.setQueryData(
        key,
        previous.filter((existing) => existing.title !== title),
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
  return { saved, ...useCustomTitleMutations(client, babyId) };
}
