import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, UserCheck, UserX, Pencil } from 'lucide-react';
import { ROLE_LABELS, USER_ROLES, type UserRole } from '@prams/shared';
import { useUsers, useDeactivateUser, useActivateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function UsersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate';
    userId: string;
    userName: string;
  }>({ open: false, action: 'deactivate', userId: '', userName: '' });

  const { data, isLoading } = useUsers({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    departmentId: deptFilter !== 'all' ? deptFilter : undefined,
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
        toast({ title: 'User deactivated', description: `${userName} has been deactivated.`, variant: 'success' });
      } else {
        await activateMutation.mutateAsync(userId);
        toast({ title: 'User activated', description: `${userName} has been activated.`, variant: 'success' });
      }
    } catch {
      toast({ title: 'Action failed', description: 'Something went wrong.', variant: 'error' });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default' as const;
      case 'ceo': return 'destructive' as const;
      case 'coo': return 'warning' as const;
      case 'dept_head': return 'info' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts and permissions.">
        <Button onClick={() => navigate('/users/new')}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
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
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Try adjusting your filters or add a new user."
              action={
                <Button variant="outline" onClick={() => navigate('/users/new')}>
                  <Plus className="h-4 w-4" /> Add User
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.employeeId}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {ROLE_LABELS[user.role as UserRole]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.department?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'success' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                              align="end"
                            >
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                onSelect={() => navigate(`/users/${user._id}/edit`)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-border" />
                              {user.isActive ? (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
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
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-emerald-600 outline-none hover:bg-emerald-50"
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && (
                <div className="border-t px-4">
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
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
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
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
