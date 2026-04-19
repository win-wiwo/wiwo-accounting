import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDepartmentSchema, type CreateDepartmentInput } from '@prams/shared';
import { useDepartment, useCreateDepartment, useUpdateDepartment } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

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
      toast({ title: 'Error', description: message || 'Failed to save.', variant: 'error' });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? 'Edit Department' : 'Create Department'}>
        <Button variant="outline" onClick={() => navigate('/departments')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Department Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input id="name" placeholder="e.g. Engineering" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="e.g. ENG" className="uppercase" {...register('code')} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
                <p className="text-xs text-muted-foreground">2-10 chars, used in PR numbering.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Brief description of this department..."
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/departments')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Department'}
          </Button>
        </div>
      </form>
    </div>
  );
}
