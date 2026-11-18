import type { DashboardEdit, DashboardLayout } from '@babble/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
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

export function useDashboardEditor(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.dashboard(familyId);
  const [unsaved, setUnsaved] = useState<DashboardLayout | null>(null);
  const latest = useRef<DashboardLayout | null>(null);
  const save = useMutation({
    scope: { id: `dashboard:${familyId}` },
    mutationFn: (layout: DashboardLayout) => saveDashboard(client, familyId, layout),
    onMutate: () => queryClient.cancelQueries({ queryKey }),
    onSuccess: (_saved, layout) => {
      if (latest.current !== layout) return;
      latest.current = null;
      setUnsaved(null);
    },
    onError: (_error, layout) => {
      if (latest.current === layout) setUnsaved(layout);
    },
  });
  const send = (layout: DashboardLayout) => {
    latest.current = layout;
    queryClient.setQueryData(queryKey, layout);
    save.mutate(layout);
  };
  return {
    unsaved,
    edit: (change: DashboardEdit, shown: DashboardLayout) => {
      const base = latest.current ?? queryClient.getQueryData<DashboardLayout>(queryKey) ?? shown;
      const next = change(base);
      if (next !== base) send(next);
    },
    retry: () => {
      if (unsaved) send(unsaved);
    },
    discard: () => {
      latest.current = null;
      setUnsaved(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}
