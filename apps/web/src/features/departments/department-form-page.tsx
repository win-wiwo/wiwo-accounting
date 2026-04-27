import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { createDepartmentSchema, type CreateDepartmentInput } from '@prams/shared';
import {
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
} from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageHeader,
  Surface,
  PrimaryButton,
  GhostButton,
  FormField,
  premiumTextareaClass,
} from '@/components/premium';

export function DepartmentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: deptData, isLoading } = useDepartment(id ?? '');
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
  });

  useEffect(() => {
    if (isEdit && deptData?.data) {
      const d = deptData.data;
      reset({ name: d.name, code: d.code, description: d.description || '' });
    }
  }, [isEdit, deptData, reset]);

  const onSubmit = async (data: CreateDepartmentInput) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data });
        toast({ title: 'Department updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Department created', variant: 'success' });
      }
      navigate('/departments');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({
        title: 'Error',
        description: message || 'Failed to save.',
        variant: 'error',
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-48" />
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={isEdit ? 'Edit Department' : 'Create Department'}
        actions={
          <GhostButton onClick={() => navigate('/departments')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Surface delay={0.04} className="max-w-2xl">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[15px] font-semibold text-zinc-900">Department Details</h2>
          </div>
          <div className="px-6 pb-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Department Name"
                htmlFor="name"
                required
                error={errors.name?.message}
              >
                <Input id="name" placeholder="e.g. Engineering" {...register('name')} />
              </FormField>
              <FormField
                label="Code"
                htmlFor="code"
                required
                error={errors.code?.message}
                help="2–10 chars, used in PR numbering."
              >
                <Input
                  id="code"
                  placeholder="e.g. ENG"
                  className="uppercase"
                  {...register('code')}
                />
              </FormField>
            </div>

            <FormField
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
            >
              <textarea
                id="description"
                rows={3}
                className={premiumTextareaClass}
                placeholder="Brief description of this department..."
                {...register('description')}
              />
            </FormField>
          </div>
        </Surface>

        <div className="mt-6 flex justify-end gap-2">
          <GhostButton type="button" onClick={() => navigate('/departments')}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Department'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
