import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@prams/shared';
import { ToastProvider } from '@/components/ui/toast';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/features/auth/login-page';
import { ChangePasswordPage } from '@/features/auth/change-password-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { UsersListPage } from '@/features/users/users-list-page';
import { UserFormPage } from '@/features/users/user-form-page';
import { DepartmentsListPage } from '@/features/departments/departments-list-page';
import { DepartmentFormPage } from '@/features/departments/department-form-page';
import { DepartmentDetailPage } from '@/features/departments/department-detail-page';
import { ProtectedRoute } from '@/routes/protected-route';
import { PrListPage } from '@/features/purchase-requests/pr-list-page';
import { PrFormPage } from '@/features/purchase-requests/pr-form-page';
import { PrDetailPage } from '@/features/purchase-requests/pr-detail-page';
import { ApprovalsPage } from '@/features/approvals/approvals-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { SearchPage } from '@/features/search/search-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { SuppliersListPage } from '@/features/suppliers/suppliers-list-page';
import { SupplierFormPage } from '@/features/suppliers/supplier-form-page';
import { SupplierDetailPage } from '@/features/suppliers/supplier-detail-page';
import { PoListPage } from '@/features/purchase-orders/po-list-page';
import { PoFormPage } from '@/features/purchase-orders/po-form-page';
import { PoDetailPage } from '@/features/purchase-orders/po-detail-page';
import { ForbiddenPage, NotFoundPage } from '@/routes/error-pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              {/* User Management (Admin) */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <UsersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <UserFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <UserFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Department Management (Admin) */}
              <Route
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <DepartmentsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <DepartmentFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments/:id"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <DepartmentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <DepartmentFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Suppliers (Admin, Accounting, Procurement) */}
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT]}>
                    <SuppliersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT]}>
                    <SupplierFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers/:id"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT]}>
                    <SupplierDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT]}>
                    <SupplierFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Purchase Orders */}
              <Route path="/purchase-orders" element={<PoListPage />} />
              <Route
                path="/purchase-orders/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT]}>
                    <PoFormPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/purchase-orders/:id" element={<PoDetailPage />} />
              <Route
                path="/purchase-orders/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT]}>
                    <PoFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Search & Monitoring */}
              <Route path="/search" element={<SearchPage />} />

              {/* Purchase Requests */}
              <Route path="/purchase-requests" element={<PrListPage />} />
              <Route path="/purchase-requests/new" element={<PrFormPage />} />
              <Route path="/purchase-requests/:id" element={<PrDetailPage />} />
              <Route path="/purchase-requests/:id/edit" element={<PrFormPage />} />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO]}>
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Error pages */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
