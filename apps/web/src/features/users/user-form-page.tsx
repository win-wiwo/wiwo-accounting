import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { USER_ROLES, ROLE_LABELS, type UserRole, type CreateUserDto, type UpdateUserDto } from '@prams/shared';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const createSchema = z.object({
  employeeId: z.string().min(1, 'Required').max(20),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Need an uppercase letter')
    .regex(/[a-z]/, 'Need a lowercase letter')
    .regex(/[0-9]/, 'Need a digit')
    .regex(/[^A-Za-z0-9]/, 'Need a special character'),
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  role: z.enum(USER_ROLES as [string, ...string[]]),
  departmentId: z.string().optional(),
});

const updateSchema = createSchema.omit({ password: true, employeeId: true }).partial();

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

export function UserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: userData, isLoading: userLoading } = useUser(id ?? '');
  const { data: deptsData } = useDepartments({ limit: 100 });
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const departments = deptsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(isEdit ? (updateSchema as unknown as typeof createSchema) : createSchema),
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (isEdit && userData?.data) {
      const u = userData.data;
      reset({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        departmentId: u.departmentId ?? undefined,
        employeeId: u.employeeId,
        password: '',
      });
    }
  }, [isEdit, userData, reset]);

  const onSubmit = async (data: CreateForm | UpdateForm) => {
    try {
      if (isEdit) {
        const { employeeId: _eid, password: _pwd, ...rest } = data as CreateForm;
        void _eid;
        void _pwd;
        await updateMutation.mutateAsync({ id: id!, data: rest as unknown as UpdateUserDto });
        toast({ title: 'User updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync(data as unknown as CreateUserDto);
        toast({ title: 'User created', description: 'The new user can now log in.', variant: 'success' });
      }
      navigate('/users');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({ title: 'Error', description: message || 'Failed to save user.', variant: 'error' });
    }
  };

  if (isEdit && userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? 'Edit User' : 'Create User'}>
        <Button variant="outline" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input id="employeeId" placeholder="e.g. EMP-0042" {...register('employeeId')} />
                  {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedRole || ''}
                  onValueChange={(v) => setValue('role', v as UserRole, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role as UserRole]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={watch('departmentId') || 'none'}
                  onValueChange={(v) =>
                    setValue('departmentId', v === 'none' ? undefined : v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" type="password" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ chars with upper, lower, digit, and special character.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/users')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}
