import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import {
  USER_ROLES,
  ROLE_LABELS,
  type UserRole,
  type UserWithDepartment,
  type CreateUserDto,
  type UpdateUserDto,
} from '@prams/shared';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageHeader,
  Surface,
  PrimaryButton,
  GhostButton,
  FormField,
  premiumSelectTriggerClass,
} from '@/components/premium';

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

interface Department {
  _id: string;
  name: string;
  code: string;
}

export function UserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;

  const { data: userData, isLoading: userLoading } = useUser(id ?? '');
  const { data: deptsData, isLoading: deptsLoading } = useDepartments({ limit: 100 });

  const departments: Department[] = (deptsData?.data ?? []) as Department[];

  if ((isEdit && userLoading) || deptsLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Surface>
            <div className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Surface>
          <Surface>
            <div className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  const existingUser = userData?.data as UserWithDepartment | undefined;

  return (
    <UserFormContent
      key={existingUser?._id ?? 'new'}
      isEdit={isEdit}
      userId={id}
      existingUser={existingUser}
      departments={departments}
    />
  );
}

interface UserFormContentProps {
  isEdit: boolean;
  userId?: string;
  existingUser?: UserWithDepartment;
  departments: Department[];
}

function UserFormContent({
  isEdit,
  userId,
  existingUser,
  departments,
}: UserFormContentProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(
      isEdit ? (updateSchema as unknown as typeof createSchema) : createSchema,
    ),
    defaultValues:
      isEdit && existingUser
        ? {
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            email: existingUser.email,
            role: existingUser.role,
            departmentId: existingUser.departmentId ?? undefined,
            employeeId: existingUser.employeeId,
          }
        : undefined,
  });

  const selectedRole = watch('role');
  const selectedDeptId = watch('departmentId');

  const onSubmit = async (data: CreateForm | UpdateForm) => {
    try {
      if (isEdit) {
        const { employeeId: _eid, password: _pwd, ...rest } = data as CreateForm;
        void _eid;
        void _pwd;
        await updateMutation.mutateAsync({
          id: userId!,
          data: rest as unknown as UpdateUserDto,
        });
        toast({ title: 'User updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync(data as unknown as CreateUserDto);
        toast({
          title: 'User created',
          description: 'The new user can now log in.',
          variant: 'success',
        });
      }
      navigate('/users');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({
        title: 'Error',
        description: message || 'Failed to save user.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={isEdit ? 'Edit User' : 'Create User'}
        actions={
          <GhostButton onClick={() => navigate('/users')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          className="pr-list-section grid gap-6 lg:grid-cols-2"
          style={{ animationDelay: '0.04s' }}
        >
          {/* Personal */}
          <Surface>
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">Personal Information</h2>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="First Name"
                  htmlFor="firstName"
                  required
                  error={errors.firstName?.message}
                >
                  <Input id="firstName" {...register('firstName')} />
                </FormField>
                <FormField
                  label="Last Name"
                  htmlFor="lastName"
                  required
                  error={errors.lastName?.message}
                >
                  <Input id="lastName" {...register('lastName')} />
                </FormField>
              </div>

              <FormField
                label="Email"
                htmlFor="email"
                required
                error={errors.email?.message}
              >
                <Input id="email" type="email" {...register('email')} />
              </FormField>

              {!isEdit && (
                <FormField
                  label="Employee ID"
                  htmlFor="employeeId"
                  required
                  error={errors.employeeId?.message}
                >
                  <Input
                    id="employeeId"
                    placeholder="e.g. EMP-0042"
                    {...register('employeeId')}
                  />
                </FormField>
              )}
            </div>
          </Surface>

          {/* Role & Access */}
          <Surface>
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">Role & Access</h2>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <FormField label="Role" required error={errors.role?.message}>
                <Select
                  value={selectedRole || ''}
                  onValueChange={(v) =>
                    setValue('role', v as UserRole, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className={premiumSelectTriggerClass}>
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
              </FormField>

              <FormField label="Department">
                <Select
                  value={selectedDeptId || 'none'}
                  onValueChange={(v) =>
                    setValue('departmentId', v === 'none' ? undefined : v, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className={premiumSelectTriggerClass}>
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
              </FormField>

              {!isEdit && (
                <FormField
                  label="Temporary Password"
                  htmlFor="password"
                  required
                  error={errors.password?.message}
                  help="Must be 8+ chars with upper, lower, digit, and special character."
                >
                  <Input id="password" type="password" {...register('password')} />
                </FormField>
              )}
            </div>
          </Surface>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <GhostButton type="button" onClick={() => navigate('/users')}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create User'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
