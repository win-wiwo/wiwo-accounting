import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@prams/shared';
import {
  useDepartment,
  useDepartmentMembers,
  useAddDepartmentMember,
  useRemoveDepartmentMember,
  useSetDepartmentHead,
  useDeleteDepartment,
} from '@/hooks/use-departments';
import { useUsers } from '@/hooks/use-users';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolvePhotoUrl } from '@/lib/utils';
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
  Surface,
  StatusBadge,
  EmptyState,
  GhostButton,
  PrimaryButton,
} from '@/components/premium';

export function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: deptData, isLoading: deptLoading } = useDepartment(id!);
  const { data: membersData, isLoading: membersLoading } = useDepartmentMembers(id!);
  const addMember = useAddDepartmentMember();
  const removeMember = useRemoveDepartmentMember();
  const setHead = useSetDepartmentHead();
  const deleteDept = useDeleteDepartment();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{
    open: boolean;
    userId: string;
    name: string;
  }>({ open: false, userId: '', name: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: searchUsersData } = useUsers({
    search: memberSearch || undefined,
    limit: 10,
  });

  const dept = deptData?.data;
  const deptHead = dept?.head as
    | { _id: string; firstName: string; lastName: string; email: string; employeeId: string }
    | null
    | undefined;
  const members = membersData?.data ?? [];
  const searchResults = (searchUsersData?.data ?? []).filter(
    (u) => !members.some((m) => m._id === u._id),
  );

  const handleAddMember = async (userId: string) => {
    try {
      await addMember.mutateAsync({ deptId: id!, userId });
      toast({ title: 'Member added', variant: 'success' });
      setAddDialogOpen(false);
      setMemberSearch('');
    } catch {
      toast({ title: 'Failed to add member', variant: 'error' });
    }
  };

  const handleRemoveMember = async () => {
    try {
      await removeMember.mutateAsync({ deptId: id!, userId: confirmRemove.userId });
      toast({ title: 'Member removed', variant: 'success' });
    } catch {
      toast({ title: 'Failed to remove member', variant: 'error' });
    }
    setConfirmRemove({ open: false, userId: '', name: '' });
  };

  const handleSetHead = async (userId: string) => {
    try {
      await setHead.mutateAsync({ deptId: id!, userId });
      toast({ title: 'Department head updated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to set head', variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDept.mutateAsync(id!);
      toast({
        title: 'Department deleted',
        description: `${dept?.name} has been deleted.`,
        variant: 'success',
      });
      navigate('/departments');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete department.';
      toast({ title: 'Cannot delete', description: msg, variant: 'error' });
    }
    setConfirmDelete(false);
  };

  if (deptLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Surface key={i}>
              <div className="p-6 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </Surface>
          ))}
        </div>
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <PageHeader
          title="Department"
          description="The requested department could not be loaded."
          actions={
            <GhostButton onClick={() => navigate('/departments')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
          }
        />
        <Surface>
          <EmptyState
            icon={<Users />}
            title="Department not found"
            action={
              <GhostButton onClick={() => navigate('/departments')}>
                Back to Departments
              </GhostButton>
            }
          />
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={dept.name}
        description={dept.description || undefined}
        meta={
          <StatusBadge tone={dept.isActive ? 'success' : 'gray'}>
            {dept.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => navigate('/departments')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
            <GhostButton onClick={() => navigate(`/departments/${id}/edit`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </GhostButton>
            <GhostButton
              onClick={() => setConfirmDelete(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </GhostButton>
          </div>
        }
      />

      {/* Stats */}
      <div
        className="pr-list-section grid gap-4 sm:grid-cols-3"
        style={{ animationDelay: '0.04s' }}
      >
        <Surface elevation="subtle">
          <div className="p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Code
            </p>
            <p className="mt-2 font-mono text-[20px] font-bold text-zinc-900">{dept.code}</p>
          </div>
        </Surface>
        <Surface elevation="subtle">
          <div className="p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Members
            </p>
            <p className="mt-2 text-[20px] font-bold text-zinc-900 tabular-nums">
              {members.length}
            </p>
          </div>
        </Surface>
        <Surface elevation="subtle">
          <div className="p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Department Head
            </p>
            <p className="mt-2 text-[14px] font-semibold text-zinc-900 truncate">
              {deptHead ? (
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  {deptHead.firstName} {deptHead.lastName}
                </span>
              ) : (
                <span className="text-zinc-400 font-normal">Not assigned</span>
              )}
            </p>
          </div>
        </Surface>
      </div>

      {/* Members */}
      <Surface delay={0.08}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[15px] font-semibold text-zinc-900">Members</h2>
          <PrimaryButton onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Member
          </PrimaryButton>
        </div>

        {membersLoading ? (
          <div className="space-y-1 px-6 pb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No members yet"
            description="Add employees to this department."
            action={
              <PrimaryButton onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Add Member
              </PrimaryButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/95 border-b border-zinc-100">
                <tr>
                  <Th>Employee</Th>
                  <Th>Employee ID</Th>
                  <Th>Role</Th>
                  <th className="h-11 w-36" />
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => {
                  const isHead = deptHead?._id === member._id;
                  return (
                    <tr
                      key={member._id}
                      className="pr-row-enter border-b border-zinc-100/60 last:border-0 transition-colors duration-150 hover:bg-zinc-50/80 group"
                      style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage
                              src={resolvePhotoUrl(member.photoUrl)}
                              alt={`${member.firstName} ${member.lastName}`}
                            />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[12px] font-semibold">
                              {member.firstName[0]}
                              {member.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-zinc-800 truncate">
                                {member.firstName} {member.lastName}
                              </span>
                              {isHead && (
                                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[12px] text-zinc-400 truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-[13px] text-zinc-700">
                          {member.employeeId}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone="gray">
                          {ROLE_LABELS[member.role as UserRole]}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {!isHead && (
                            <button
                              onClick={() => handleSetHead(member._id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                            >
                              <Crown className="h-3 w-3" /> Make Head
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setConfirmRemove({
                                open: true,
                                userId: member._id,
                                name: `${member.firstName} ${member.lastName}`,
                              })
                            }
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label="Remove member"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Search for a user to add to {dept.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              autoFocus
              className="w-full h-10 rounded-lg border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {memberSearch.length < 2 ? (
              <p className="py-4 text-center text-[13px] text-zinc-400">
                Type at least 2 characters to search.
              </p>
            ) : searchResults.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-zinc-400">
                No matching users found.
              </p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-150 hover:bg-zinc-50"
                    onClick={() => handleAddMember(user._id)}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={resolvePhotoUrl(user.photoUrl)}
                        alt={`${user.firstName} ${user.lastName}`}
                      />
                      <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[12px] font-semibold">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-800 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-[12px] text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-zinc-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <Dialog
        open={confirmRemove.open}
        onOpenChange={(open) => setConfirmRemove({ ...confirmRemove, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove{' '}
              <span className="font-medium text-foreground">{confirmRemove.name}</span> from{' '}
              {dept.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemove({ ...confirmRemove, open: false })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{dept.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDept.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
      {children}
    </th>
  );
}
