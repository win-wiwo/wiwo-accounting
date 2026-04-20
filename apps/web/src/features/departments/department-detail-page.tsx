import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Pencil,
  Plus,
  Search,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@prams/shared';
import {
  useDepartment,
  useDepartmentMembers,
  useAddDepartmentMember,
  useRemoveDepartmentMember,
  useSetDepartmentHead,
} from '@/hooks/use-departments';
import { useUsers } from '@/hooks/use-users';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: deptData, isLoading: deptLoading } = useDepartment(id!);
  const { data: membersData, isLoading: membersLoading } = useDepartmentMembers(id!);
  const addMember = useAddDepartmentMember();
  const removeMember = useRemoveDepartmentMember();
  const setHead = useSetDepartmentHead();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ open: boolean; userId: string; name: string }>({
    open: false,
    userId: '',
    name: '',
  });

  // Search for users not already in this department
  const { data: searchUsersData } = useUsers({
    search: memberSearch || undefined,
    limit: 10,
  });

  const dept = deptData?.data;
  const deptHead = dept?.headId as unknown as { _id: string; firstName: string; lastName: string; email: string; employeeId: string } | null | undefined;
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

  if (deptLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dept) {
    return <EmptyState title="Department not found" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={dept.name} description={dept.description || undefined}>
        <Button variant="outline" onClick={() => navigate('/departments')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => navigate(`/departments/${id}/edit`)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </PageHeader>

      {/* Department Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Code</p>
            <p className="mt-1 font-mono text-lg font-bold">{dept.code}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="mt-1 text-lg font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Department Head</p>
            <p className="mt-1 text-lg font-bold">
              {deptHead ? `${deptHead.firstName} ${deptHead.lastName}` : 'Not assigned'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Members</CardTitle>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {membersLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Add employees to this department."
              action={
                <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Add Member
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isHead = deptHead?._id === member._id;
                  return (
                    <TableRow key={member._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {member.firstName[0]}{member.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{member.firstName} {member.lastName}</span>
                              {isHead && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.employeeId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ROLE_LABELS[member.role as UserRole]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!isHead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleSetHead(member._id)}
                            >
                              <Crown className="h-3 w-3" /> Make Head
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() =>
                              setConfirmRemove({
                                open: true,
                                userId: member._id,
                                name: `${member.firstName} ${member.lastName}`,
                              })
                            }
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {memberSearch.length < 2 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : searchResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No matching users found.
              </p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                    onClick={() => handleAddMember(user._id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm */}
      <Dialog open={confirmRemove.open} onOpenChange={(open) => setConfirmRemove({ ...confirmRemove, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-foreground">{confirmRemove.name}</span> from {dept.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove({ ...confirmRemove, open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
