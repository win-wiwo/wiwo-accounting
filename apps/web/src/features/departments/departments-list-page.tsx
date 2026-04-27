import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Crown, Trash2, Pencil } from 'lucide-react';
import { useDepartments, useDeleteDepartment } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
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
  StatusBadge,
  Pagination,
  EmptyState,
  ListSkeleton,
} from '@/components/premium';

export function DepartmentsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  const { data, isLoading } = useDepartments({
    page,
    limit: 10,
    search: search || undefined,
  });
  const deleteMutation = useDeleteDepartment();

  const departments = data?.data ?? [];
  const meta = data?.meta;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast({
        title: 'Department deleted',
        description: `${confirmDelete.name} has been deleted.`,
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete department.';
      toast({ title: 'Cannot delete', description: msg, variant: 'error' });
    }
    setConfirmDelete({ open: false, id: '', name: '' });
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Departments"
        description="Manage organizational departments."
        actions={
          <PrimaryButton onClick={() => navigate('/departments/new')}>
            <Plus className="h-4 w-4" />
            Add Department
          </PrimaryButton>
        }
      />

      <FilterBar delay={0.04}>
        <SearchInput
          placeholder="Search departments..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </FilterBar>

      <Surface delay={0.08}>
        {isLoading ? (
          <ListSkeleton />
        ) : departments.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No departments found"
            description="Create your first department to start organizing your team."
            action={
              <PrimaryButton onClick={() => navigate('/departments/new')}>
                <Plus className="h-4 w-4" /> Add Department
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <Th>Department</Th>
                    <Th>Code</Th>
                    <Th>Head</Th>
                    <Th>Status</Th>
                    <th className="h-11 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => {
                    const head = dept.head;
                    return (
                      <tr
                        key={dept._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-colors duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/departments/${dept._id}`)}
                      >
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-zinc-800 group-hover:text-zinc-950">
                            {dept.name}
                          </p>
                          {dept.description && (
                            <p className="text-[12px] text-zinc-400 line-clamp-1 mt-0.5">
                              {dept.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[12px] text-zinc-600">
                            {dept.code}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {head ? (
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="text-[13px] text-zinc-700">
                                {head.firstName} {head.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-zinc-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={dept.isActive ? 'success' : 'gray'}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={() => navigate(`/departments/${dept._id}/edit`)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  open: true,
                                  id: dept._id,
                                  name: dept.name,
                                })
                              }
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta && meta.totalPages > 1 && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Surface>

      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ ...confirmDelete, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{confirmDelete.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete({ open: false, id: '', name: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
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
