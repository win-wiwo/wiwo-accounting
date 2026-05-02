import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { Plus, UserCheck, UserX, Pencil, Users, Loader2, Save } from 'lucide-react';
import { ROLE_LABELS, USER_ROLES, type UserRole, type CreateUserDto, type UpdateUserDto } from '@prams/shared';
import { useUsers, useCreateUser, useDeactivateUser, useActivateUser, useUpdateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FormField,
  premiumSelectTriggerClass,
  StatusBadge,
  Pagination,
  EmptyState,
  ListSkeleton,
  type BadgeTone,
} from '@/components/premium';
import { resolvePhotoUrl } from '@/lib/utils';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<{
    open: boolean;
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    departmentId?: string;
  } | null>(null);

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
          <PrimaryButton onClick={() => setCreateOpen(true)}>
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
              <PrimaryButton onClick={() => setCreateOpen(true)}>
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
                    <th className="h-11 w-24" />
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
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() =>
                              setEditUser({
                                open: true,
                                _id: user._id,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                role: user.role,
                                departmentId: user.departmentId ?? undefined,
                              })
                            }
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {user.isActive ? (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  action: 'deactivate',
                                  userId: user._id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="Deactivate"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  action: 'activate',
                                  userId: user._id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              aria-label="Activate"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
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

      {editUser && (
        <EditUserModal
          key={editUser._id}
          open={editUser.open}
          onOpenChange={(open) => {
            if (!open) setEditUser(null);
          }}
          user={editUser}
          departments={departments}
        />
      )}

      <CreateUserModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
      />
    </div>
  );
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    departmentId?: string;
  };
  departments: { _id: string; name: string }[];
}

function EditUserModal({ open, onOpenChange, user, departments }: EditUserModalProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateUser();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? 'none');

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setRole(user.role);
    setDepartmentId(user.departmentId ?? 'none');
  }, [user]);

  const handleSave = async () => {
    const data: UpdateUserDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role: role as UserRole,
      departmentId: departmentId === 'none' ? null : departmentId,
    };
    try {
      await updateMutation.mutateAsync({ id: user._id, data });
      toast({ title: 'User updated', variant: 'success' });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update user.';
      toast({ title: 'Error', description: message || 'Failed to update user.', variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update details for {user.firstName} {user.lastName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First Name" htmlFor="edit-firstName" required>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>
            <FormField label="Last Name" htmlFor="edit-lastName" required>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="edit-email" required>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Role" required>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className={premiumSelectTriggerClass}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r as UserRole]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Department">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className={premiumSelectTriggerClass}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleSave}
            disabled={updateMutation.isPending || !firstName.trim() || !lastName.trim() || !email.trim() || !role}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { _id: string; name: string }[];
}

function CreateUserModal({ open, onOpenChange, departments }: CreateUserModalProps) {
  const { toast } = useToast();
  const createMutation = useCreateUser();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState('none');

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setEmployeeId('');
    setPassword('');
    setRole('');
    setDepartmentId('none');
  };

  const handleCreate = async () => {
    const data: CreateUserDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      employeeId: employeeId.trim(),
      password,
      role: role as UserRole,
      departmentId: departmentId === 'none' ? undefined : departmentId,
    };
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: 'User created',
        description: 'The new user can now log in.',
        variant: 'success',
      });
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create user.';
      toast({ title: 'Error', description: message || 'Failed to create user.', variant: 'error' });
    }
  };

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    employeeId.trim() &&
    password.length >= 8 &&
    role;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Add a new user to the system.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First Name" htmlFor="create-firstName" required>
              <Input
                id="create-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>
            <FormField label="Last Name" htmlFor="create-lastName" required>
              <Input
                id="create-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="create-email" required>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Employee ID" htmlFor="create-employeeId" required>
              <Input
                id="create-employeeId"
                placeholder="e.g. EMP-0042"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </FormField>
            <FormField
              label="Temporary Password"
              htmlFor="create-password"
              required
              help="8+ chars, upper, lower, digit, special."
            >
              <Input
                id="create-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Role" required>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className={premiumSelectTriggerClass}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r as UserRole]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Department">
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className={premiumSelectTriggerClass}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleCreate}
            disabled={createMutation.isPending || !canSubmit}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create User
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
