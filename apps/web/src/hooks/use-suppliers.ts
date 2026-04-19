import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, type SuppliersQuery, type CreateSupplierPayload } from '@/lib/api-services';

export function useSuppliers(params: SuppliersQuery = {}) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersApi.list(params),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierPayload) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSupplierPayload> & { status?: string } }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
