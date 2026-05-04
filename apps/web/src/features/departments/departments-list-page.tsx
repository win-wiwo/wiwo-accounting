import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Crown, Trash2, Pencil, Loader2, Save } from 'lucide-react';
import { type UpdateDepartmentDto } from '@prams/shared';
import { useDepartments, useDeleteDepartment, useUpdateDepartment, useCreateDepartment } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FormField,
  premiumTextareaClass,
  StatusBadge,
  Pagination,
  EmptyState,
  ListSkeleton,
} from '@/components/premium';

export function DepartmentsListPage() {
  usePageTitle('Departments');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<{
    open: boolean;
    _id: string;
    name: string;
    code: string;
    description: string;
  } | null>(null);

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
          <PrimaryButton onClick={() => setCreateOpen(true)}>
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
              <PrimaryButton onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add Department
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-hidden">
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
                          <p className="text-body font-medium text-zinc-800 group-hover:text-zinc-950">
                            {dept.name}
                          </p>
                          {dept.description && (
                            <p className="text-label text-zinc-400 line-clamp-1 mt-0.5">
                              {dept.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-label text-zinc-600">
                            {dept.code}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {head ? (
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="text-body text-zinc-700">
                                {head.firstName} {head.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-body text-zinc-400">Not assigned</span>
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
                              onClick={() =>
                                setEditDept({
                                  open: true,
                                  _id: dept._id,
                                  name: dept.name,
                                  code: dept.code,
                                  description: dept.description || '',
                                })
                              }
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
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete({ open: false, id: '', name: '' })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editDept && (
        <EditDepartmentModal
          key={editDept._id}
          open={editDept.open}
          onOpenChange={(open) => {
            if (!open) setEditDept(null);
          }}
          dept={editDept}
        />
      )}

      <CreateDepartmentModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

interface EditDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dept: { _id: string; name: string; code: string; description: string };
}

function EditDepartmentModal({ open, onOpenChange, dept }: EditDepartmentModalProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateDepartment();

  const [name, setName] = useState(dept.name);
  const [code, setCode] = useState(dept.code);
  const [description, setDescription] = useState(dept.description);

  useEffect(() => {
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description);
  }, [dept]);

  const handleSave = async () => {
    const data: UpdateDepartmentDto = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
    };
    try {
      await updateMutation.mutateAsync({ id: dept._id, data });
      toast({ title: 'Department updated', variant: 'success' });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update department.';
      toast({ title: 'Error', description: message || 'Failed to update department.', variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Update details for {dept.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department Name" htmlFor="edit-dept-name" required>
              <Input
                id="edit-dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label="Code" htmlFor="edit-dept-code" required help="2–10 chars, used in PR numbering.">
              <Input
                id="edit-dept-code"
                value={code}
                className="uppercase"
                onChange={(e) => setCode(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="edit-dept-desc">
            <textarea
              id="edit-dept-desc"
              rows={3}
              className={premiumTextareaClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleSave}
            disabled={updateMutation.isPending || !name.trim() || !code.trim()}
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

interface CreateDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateDepartmentModal({ open, onOpenChange }: CreateDepartmentModalProps) {
  const { toast } = useToast();
  const createMutation = useCreateDepartment();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
  };

  const handleCreate = async () => {
    const data = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
    };
    try {
      await createMutation.mutateAsync(data);
      toast({ title: 'Department created', variant: 'success' });
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create department.';
      toast({ title: 'Error', description: message || 'Failed to create department.', variant: 'error' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>Add a new department to your organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department Name" htmlFor="create-dept-name" required>
              <Input
                id="create-dept-name"
                placeholder="e.g. Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label="Code" htmlFor="create-dept-code" required help="2–10 chars, used in PR numbering.">
              <Input
                id="create-dept-code"
                placeholder="e.g. ENG"
                className="uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="create-dept-desc">
            <textarea
              id="create-dept-desc"
              rows={3}
              className={premiumTextareaClass}
              placeholder="Brief description of this department..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleCreate}
            disabled={createMutation.isPending || !name.trim() || !code.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create Department
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-5 text-left text-caption font-semibold uppercase tracking-[0.06em] text-zinc-400">
      {children}
    </th>
  );
}
