import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi, type ApprovalsQuery, type ApprovalActionPayload } from '@/lib/api-services';

export function usePendingApprovals(params: ApprovalsQuery = {}) {
  return useQuery({
    queryKey: ['approvals', 'pending', params],
    queryFn: () => approvalsApi.getPending(params),
    staleTime: 0,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['approvals', 'pending', 'count'],
    queryFn: () => approvalsApi.getPendingCount(),
    refetchInterval: 60_000, // poll every minute
  });
}

export function useApprovalHistory(prId: string) {
  return useQuery({
    queryKey: ['approvals', 'history', prId],
    queryFn: () => approvalsApi.getByPurchaseRequest(prId),
    enabled: !!prId,
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApprovalActionPayload) => approvalsApi.processAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
