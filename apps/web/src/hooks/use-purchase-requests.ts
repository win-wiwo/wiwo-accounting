import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRequestsApi, type PurchaseRequestsQuery, type CreatePrPayload, type ProjectSpendingItem, type ManagementStats } from '@/lib/api-services';
import type { SubmitQuotationDto } from '@prams/shared';

interface UsePurchaseRequestsOptions {
  enabled?: boolean;
}

export function usePurchaseRequests(
  params: PurchaseRequestsQuery = {},
  options: UsePurchaseRequestsOptions = {},
) {
  return useQuery({
    queryKey: ['purchase-requests', params],
    queryFn: () => purchaseRequestsApi.list(params),
    enabled: options.enabled ?? true,
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

export function useProjectSpending(_params?: undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['purchase-requests', 'stats', 'by-project'],
    queryFn: () => purchaseRequestsApi.getProjectSpending(),
    select: (data) => (data as unknown as { data?: ProjectSpendingItem[] })?.data ?? [],
    enabled: options?.enabled ?? true,
  });
}

export function useManagementStats() {
  return useQuery({
    queryKey: ['purchase-requests', 'stats', 'management'],
    queryFn: () => purchaseRequestsApi.getManagementStats(),
    select: (data) => (data as unknown as { data?: ManagementStats })?.data ?? null,
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

export function useSubmitQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitQuotationDto }) =>
      purchaseRequestsApi.submitQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useReturnForInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      purchaseRequestsApi.returnForInfo(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useReplyToClarification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      purchaseRequestsApi.replyToClarification(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUpdateItemSpecs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: Array<{ itemId: string; description: string; specifications?: string }> }) =>
      purchaseRequestsApi.updateItemSpecs(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUploadItemPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId, file }: { id: string; itemId: string; file: File }) =>
      purchaseRequestsApi.uploadItemPhoto(id, itemId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useRemoveItemPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      purchaseRequestsApi.removeItemPhoto(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
