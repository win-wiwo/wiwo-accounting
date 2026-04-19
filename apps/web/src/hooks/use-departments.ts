import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, type DepartmentsQuery } from '@/lib/api-services';
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@prams/shared';

export function useDepartments(params: DepartmentsQuery = {}) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: () => departmentsApi.list(params),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useDepartmentMembers(id: string) {
  return useQuery({
    queryKey: ['departments', id, 'members'],
    queryFn: () => departmentsApi.getMembers(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => departmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDto }) =>
      departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useAddDepartmentMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, userId }: { deptId: string; userId: string }) =>
      departmentsApi.addMember(deptId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.deptId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveDepartmentMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, userId }: { deptId: string; userId: string }) =>
      departmentsApi.removeMember(deptId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.deptId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useSetDepartmentHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, userId }: { deptId: string; userId: string }) =>
      departmentsApi.setHead(deptId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', variables.deptId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
