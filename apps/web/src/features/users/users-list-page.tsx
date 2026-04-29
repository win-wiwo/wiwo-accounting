import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, UserCheck, UserX, Pencil, Users } from 'lucide-react';
import { ROLE_LABELS, USER_ROLES, type UserRole } from '@prams/shared';
import { useUsers, useDeactivateUser, useActivateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PageHeader,
  PrimaryButton,
  Surface,
  FilterBar,
  SearchInput,
  FilterControls,
  premiumSelectTriggerClass,
  StatusBadge,
  Pagination,
  EmptyState,
  ListSkeleton,
  type BadgeTone,
} from '@/components/premium';
import { resolvePhotoUrl } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const ROLE_TONE: Record<string, BadgeTone> = {
  admin:       'neutral',
  ceo:         'danger',
  coo:         'warn',
  dept_head:   'info',
  procurement: 'violet',
  accounting:  'indigo',
  staff:       'gray',
};

export function UsersListPage() {
  usePageTitle('Users');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate';
    userId: string;
    userName: string;
  }>({ open: false, action: 'deactivate', userId: '', userName: '' });

  const { data, isLoading } = useUsers({
    page,
    limit,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    departmentId: deptFilter !== 'all' ? deptFilter : undefined,
    isActive: statusFilter === 'active' ? 'true' : 'false',
  });

  const { data: deptsData } = useDepartments({ limit: 100 });
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();

  const users = data?.data ?? [];
  const meta = data?.meta;
  const departments = deptsData?.data ?? [];

  const handleToggleStatus = async () => {
    const { action, userId, userName } = confirmDialog;
    try {
      if (action === 'deactivate') {
        await deactivateMutation.mutateAsync(userId);
        toast({
          title: 'User deactivated',
          description: `${userName} has been deactivated.`,
          variant: 'success',
        });
      } else {
        await activateMutation.mutateAsync(userId);
        toast({
          title: 'User activated',
          description: `${userName} has been activated.`,
          variant: 'success',
        });
      }
    } catch {
      toast({
        title: 'Action failed',
        description: 'Something went wrong.',
        variant: 'error',
      });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions."
        actions={
          <PrimaryButton onClick={() => navigate('/users/new')}>
            <Plus className="h-4 w-4" />
            Add User
          </PrimaryButton>
        }
      />

      <FilterBar delay={0.04}>
        <SearchInput
          placeholder="Search by name, email, or employee ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <FilterControls>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className={`${premiumSelectTriggerClass} w-full sm:w-[160px]`}>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {USER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role as UserRole]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={deptFilter}
            onValueChange={(v) => {
              setDeptFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className={`${premiumSelectTriggerClass} w-full sm:w-[180px]`}>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept._id} value={dept._id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as 'active' | 'inactive');
              setPage(1);
            }}
          >
            <SelectTrigger className={`${premiumSelectTriggerClass} w-full sm:w-[130px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterControls>
      </FilterBar>

      <Surface delay={0.08}>
        {isLoading ? (
          <ListSkeleton />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No users found"
            description="Try adjusting your filters or add a new user."
            action={
              <PrimaryButton onClick={() => navigate('/users/new')}>
                <Plus className="h-4 w-4" /> Add User
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <Th>User</Th>
                    <Th>Employee ID</Th>
                    <Th>Role</Th>
                    <Th>Department</Th>
                    <Th>Status</Th>
                    <th className="h-11 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr
                      key={user._id}
                      className="pr-row-enter border-b border-zinc-100/60 last:border-0 transition-colors duration-150 hover:bg-zinc-50/80 group"
                      style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage
                              src={resolvePhotoUrl(user.photoUrl)}
                              alt={`${user.firstName} ${user.lastName}`}
                            />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[12px] font-semibold">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-zinc-800 truncate group-hover:text-zinc-950">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[12px] text-zinc-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-[13px] text-zinc-700">{user.employeeId}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={ROLE_TONE[user.role] ?? 'neutral'}>
                          {ROLE_LABELS[user.role as UserRole]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-zinc-500">
                        {user.department?.name || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={user.isActive ? 'success' : 'gray'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all duration-150 focus:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-in fade-in-0 zoom-in-95"
                              align="end"
                              sideOffset={4}
                            >
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 outline-none hover:bg-zinc-50 transition-colors"
                                onSelect={() => navigate(`/users/${user._id}/edit`)}
                              >
                                <Pencil className="h-3.5 w-3.5 text-zinc-400" /> Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
                              {user.isActive ? (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 outline-none hover:bg-red-50 transition-colors"
                                  onSelect={() =>
                                    setConfirmDialog({
                                      open: true,
                                      action: 'deactivate',
                                      userId: user._id,
                                      userName: `${user.firstName} ${user.lastName}`,
                                    })
                                  }
                                >
                                  <UserX className="h-3.5 w-3.5" /> Deactivate
                                </DropdownMenu.Item>
                              ) : (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-emerald-700 outline-none hover:bg-emerald-50 transition-colors"
                                  onSelect={() =>
                                    setConfirmDialog({
                                      open: true,
                                      action: 'activate',
                                      userId: user._id,
                                      userName: `${user.firstName} ${user.lastName}`,
                                    })
                                  }
                                >
                                  <UserCheck className="h-3.5 w-3.5" /> Activate
                                </DropdownMenu.Item>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
              />
            )}
          </>
        )}
      </Surface>

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'} User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action}{' '}
              <span className="font-medium text-foreground">{confirmDialog.userName}</span>?
              {confirmDialog.action === 'deactivate' &&
                ' They will no longer be able to log in.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'deactivate' ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
            >
              {confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
