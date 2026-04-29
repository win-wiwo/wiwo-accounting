import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, type PurchaseOrdersQuery } from '@/lib/api-services';

export function usePoStats() {
  return useQuery({
    queryKey: ['purchase-orders', 'stats'],
    queryFn: () => purchaseOrdersApi.getStats(),
    select: (data) => data?.data,
  });
}

export function usePoMonthlyStats() {
  return useQuery({
    queryKey: ['purchase-orders', 'stats', 'monthly'],
    queryFn: () => purchaseOrdersApi.getMonthlyStats(),
    select: (data) => data?.data?.receivedThisMonth ?? 0,
  });
}

export function usePurchaseOrders(params: PurchaseOrdersQuery = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => purchaseOrdersApi.list(params),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => purchaseOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function usePurchaseOrderByPr(prId: string) {
  return useQuery({
    queryKey: ['purchase-orders', 'by-pr', prId],
    queryFn: () => purchaseOrdersApi.getByPurchaseRequest(prId),
    enabled: !!prId,
    select: (data) => data?.data,
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estimatedArrivalDate?: string; remarks?: string } }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useMarkOrdered() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estimatedArrivalDate }: { id: string; estimatedArrivalDate: string | null }) =>
      purchaseOrdersApi.markOrdered(id, estimatedArrivalDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdateArrivalDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estimatedArrivalDate }: { id: string; estimatedArrivalDate: string }) =>
      purchaseOrdersApi.updateArrivalDate(id, estimatedArrivalDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      purchaseOrdersApi.receive(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      purchaseOrdersApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}
