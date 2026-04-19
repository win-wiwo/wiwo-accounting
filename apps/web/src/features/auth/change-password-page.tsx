import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api-services';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Save, CheckCircle2 } from 'lucide-react';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Min 8 characters')
      .regex(/[A-Z]/, 'Need an uppercase letter')
      .regex(/[a-z]/, 'Need a lowercase letter')
      .regex(/[0-9]/, 'Need a digit')
      .regex(/[^A-Za-z0-9]/, 'Need a special character'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const newPassword = watch('newPassword', '');

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'A digit', met: /[0-9]/.test(newPassword) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast({ title: 'Password changed', description: 'Your password has been updated.', variant: 'success' });
      reset();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({ title: 'Error', description: message || 'Failed to change password.', variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Change Password" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">Update Your Password</CardTitle>
            <CardDescription>
              Choose a strong password that you don't use elsewhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  className="pr-10"
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  className="pr-10"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${req.met ? 'text-emerald-500' : 'text-muted-foreground/40'}`}
                      />
                      <span className={req.met ? 'text-emerald-700' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
