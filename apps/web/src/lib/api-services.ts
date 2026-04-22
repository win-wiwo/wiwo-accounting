import apiClient from './api-client';
import type {
  ApiResponse,
  User,
  UserWithDepartment,
  CreateUserDto,
  UpdateUserDto,
  Department,
  DepartmentWithHead,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  PurchaseRequest,
  PaginationMeta,
} from '@prams/shared';

// ─── Users ───────────────────────────────────────────────────

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  departmentId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const usersApi = {
  list: (params: UsersQuery = {}) =>
    apiClient
      .get<ApiResponse<UserWithDepartment[]> & { meta: PaginationMeta }>('/users', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<UserWithDepartment>>(`/users/${id}`).then((r) => r.data),

  create: (data: CreateUserDto) =>
    apiClient.post<ApiResponse<User>>('/users', data).then((r) => r.data),

  update: (id: string, data: UpdateUserDto) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}`, data).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`).then((r) => r.data),

  activate: (id: string) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`).then((r) => r.data),
};

// ─── Departments ─────────────────────────────────────────────

export interface DepartmentsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const departmentsApi = {
  list: (params: DepartmentsQuery = {}) =>
    apiClient
      .get<ApiResponse<DepartmentWithHead[]> & { meta: PaginationMeta }>('/departments', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<DepartmentWithHead>>(`/departments/${id}`).then((r) => r.data),

  create: (data: CreateDepartmentDto) =>
    apiClient.post<ApiResponse<Department>>('/departments', data).then((r) => r.data),

  update: (id: string, data: UpdateDepartmentDto) =>
    apiClient.patch<ApiResponse<Department>>(`/departments/${id}`, data).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient.get<ApiResponse<User[]>>(`/departments/${id}/members`).then((r) => r.data),

  addMember: (id: string, userId: string) =>
    apiClient.post(`/departments/${id}/members`, { userId }).then((r) => r.data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/departments/${id}/members/${userId}`).then((r) => r.data),

  setHead: (id: string, userId: string) =>
    apiClient.patch(`/departments/${id}/head`, { userId }).then((r) => r.data),
};

// ─── Purchase Requests ───────────────────────────────────────

export interface PurchaseRequestsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  requestType?: string;
  departmentId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface CreatePrPayload {
  requestType?: string;
  title: string;
  projectId?: string;
  description: string;
  priority: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice: number;
    notes?: string;
  }>;
  justification: string;
  neededByDate?: string;
}

export const purchaseRequestsApi = {
  list: (params: PurchaseRequestsQuery = {}) =>
    apiClient
      .get<ApiResponse<PurchaseRequest[]> & { meta: PaginationMeta }>('/purchase-requests', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}`).then((r) => r.data),

  create: (data: CreatePrPayload) =>
    apiClient.post<ApiResponse<PurchaseRequest>>('/purchase-requests', data).then((r) => r.data),

  update: (id: string, data: Partial<CreatePrPayload>) =>
    apiClient.patch<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}`, data).then((r) => r.data),

  submit: (id: string) =>
    apiClient.post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/submit`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/purchase-requests/${id}`).then((r) => r.data),

  recall: (id: string) =>
    apiClient.post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/recall`).then((r) => r.data),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/cancel`, { reason }).then((r) => r.data),

  submitQuotation: (id: string, items: Array<{ itemId: string; quotedUnitPrice: number; selectedSupplierId?: string }>) =>
    apiClient.post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/quotation`, { items }).then((r) => r.data),

  returnForInfo: (id: string, note: string) =>
    apiClient.post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/return-for-info`, { note }).then((r) => r.data),

  uploadAttachment: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  removeAttachment: (id: string, attachmentId: string) =>
    apiClient.delete<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/attachments/${attachmentId}`).then((r) => r.data),

  downloadAttachment: (id: string, attachmentId: string, filename: string) =>
    apiClient
      .get(`/purchase-requests/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' })
      .then((r) => {
        const blob = new Blob([r.data]);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }),

  getStats: () =>
    apiClient.get<ApiResponse<{ total: number; byStatus: Record<string, { count: number; totalAmount: number }> }>>('/purchase-requests/stats').then((r) => r.data),
};

// ─── Approvals ──────────────────────────────────────────────

export interface ApprovalsQuery {
  page?: number;
  limit?: number;
}

export interface ApprovalActionPayload {
  purchaseRequestId: string;
  action: string;
  comments: string;
  conditions?: string;
}

export const approvalsApi = {
  processAction: (data: ApprovalActionPayload) =>
    apiClient.post('/approvals', data).then((r) => r.data),

  getPending: (params: ApprovalsQuery = {}) =>
    apiClient
      .get<ApiResponse<PurchaseRequest[]> & { meta: PaginationMeta }>('/approvals/pending', { params })
      .then((r) => r.data),

  getPendingCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/approvals/pending/count').then((r) => r.data),

  getByPurchaseRequest: (prId: string) =>
    apiClient.get(`/approvals/purchase-request/${prId}`).then((r) => r.data),
};

// ─── Notifications ──────────────────────────────────────────

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  list: (params: NotificationsQuery = {}) =>
    apiClient
      .get('/notifications', { params })
      .then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all').then((r) => r.data),
};

// ─── Suppliers ──────────────────────────────────────────────

export interface SuppliersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateSupplierPayload {
  companyName: string;
  address: string;
  taxType: string;
  tin: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  paymentTerms?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  notes?: string;
}

export const suppliersApi = {
  list: (params: SuppliersQuery = {}) =>
    apiClient
      .get<ApiResponse<any[]> & { meta: PaginationMeta }>('/suppliers', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/suppliers/${id}`).then((r) => r.data),

  create: (data: CreateSupplierPayload) =>
    apiClient.post<ApiResponse<any>>('/suppliers', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateSupplierPayload> & { status?: string }) =>
    apiClient.patch<ApiResponse<any>>(`/suppliers/${id}`, data).then((r) => r.data),
};

// ─── Purchase Orders ────────────────────────────────────────

export interface PurchaseOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  sourceRequestType?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface POLineItemPayload {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes?: string;
}

export interface CreatePurchaseOrderPayload {
  purchaseRequestId: string;
  sourceRequestType: string;
  supplierId?: string;
  projectName?: string;
  items?: POLineItemPayload[];
  remarks?: string;
}

export const purchaseOrdersApi = {
  list: (params: PurchaseOrdersQuery = {}) =>
    apiClient
      .get<ApiResponse<any[]> & { meta: PaginationMeta }>('/purchase-orders', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/purchase-orders/${id}`).then((r) => r.data),

  create: (data: CreatePurchaseOrderPayload) =>
    apiClient.post<ApiResponse<any>>('/purchase-orders', data).then((r) => r.data),

  update: (id: string, data: Partial<CreatePurchaseOrderPayload>) =>
    apiClient.patch<ApiResponse<any>>(`/purchase-orders/${id}`, data).then((r) => r.data),

  submit: (id: string) =>
    apiClient.post<ApiResponse<any>>(`/purchase-orders/${id}/submit`).then((r) => r.data),

  approve: (id: string) =>
    apiClient.post<ApiResponse<any>>(`/purchase-orders/${id}/approve`).then((r) => r.data),

  issue: (id: string) =>
    apiClient.post<ApiResponse<any>>(`/purchase-orders/${id}/issue`).then((r) => r.data),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<any>>(`/purchase-orders/${id}/cancel`, { reason }).then((r) => r.data),
};

// ─── Projects ────────────────────────────────────────────────

export interface ProjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const projectsApi = {
  list: (params: ProjectsQuery = {}) =>
    apiClient
      .get<ApiResponse<import('@prams/shared').Project[]> & { meta: PaginationMeta }>('/projects', { params })
      .then((r) => r.data),

  listActive: () =>
    apiClient
      .get<ApiResponse<import('@prams/shared').Project[]>>('/projects/active')
      .then((r) => r.data.data ?? []),

  getById: (id: string) =>
    apiClient.get<ApiResponse<import('@prams/shared').Project>>(`/projects/${id}`).then((r) => r.data),

  create: (data: import('@prams/shared').CreateProjectDto) =>
    apiClient.post<ApiResponse<import('@prams/shared').Project>>('/projects', data).then((r) => r.data),

  update: (id: string, data: import('@prams/shared').UpdateProjectDto) =>
    apiClient.patch<ApiResponse<import('@prams/shared').Project>>(`/projects/${id}`, data).then((r) => r.data),
};

// ─── Auth ────────────────────────────────────────────────────

export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient
      .post<ApiResponse<null>>('/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),
};
