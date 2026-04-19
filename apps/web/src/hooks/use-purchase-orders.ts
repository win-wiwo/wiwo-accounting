import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, type PurchaseOrdersQuery, type CreatePurchaseOrderPayload } from '@/lib/api-services';

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

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderPayload) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePurchaseOrderPayload> }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useIssuePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.issue(id),
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
