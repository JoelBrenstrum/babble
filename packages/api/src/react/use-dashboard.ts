import type { DashboardLayout } from '@babble/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { BabbleClient } from '../client';
import { getDashboard, saveDashboard, subscribeToDashboard } from '../dashboards';
import { queryKeys } from '../queries';

export function useDashboard(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToDashboard(
        client,
        familyId,
        () => void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(familyId) }),
      ),
    [client, familyId, queryClient],
  );
  return useQuery({ queryKey: queryKeys.dashboard(familyId), queryFn: () => getDashboard(client, familyId) });
}

export function useSaveDashboard(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (layout: DashboardLayout) => saveDashboard(client, familyId, layout),
    onMutate: async (layout) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard(familyId) });
      queryClient.setQueryData(queryKeys.dashboard(familyId), layout);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(familyId) }),
  });
}
