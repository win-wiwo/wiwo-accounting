import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRequestsApi, type PurchaseRequestsQuery, type CreatePrPayload } from '@/lib/api-services';

export function usePurchaseRequests(params: PurchaseRequestsQuery = {}) {
  return useQuery({
    queryKey: ['purchase-requests', params],
    queryFn: () => purchaseRequestsApi.list(params),
  });
}

export function usePurchaseRequest(id: string) {
  return useQuery({
    queryKey: ['purchase-requests', id],
    queryFn: () => purchaseRequestsApi.getById(id),
    enabled: !!id,
  });
}

export function usePrStats() {
  return useQuery({
    queryKey: ['purchase-requests', 'stats'],
    queryFn: () => purchaseRequestsApi.getStats(),
  });
}

export function useCreatePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePrPayload) => purchaseRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUpdatePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePrPayload> }) =>
      purchaseRequestsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useSubmitPr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequestsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useDeletePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequestsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useRecallPr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequestsApi.recall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useCancelPr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      purchaseRequestsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      purchaseRequestsApi.uploadAttachment(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useRemoveAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      purchaseRequestsApi.removeAttachment(id, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
