import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Building2, Shield, Hash, Camera, Loader2 } from 'lucide-react';
import { ROLE_LABELS, type UserRole, type User } from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/lib/api-services';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolvePhotoUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setIsUploading(true);
      const result = await usersApi.uploadPhoto(file);
      setUser(result.data as User);
      toast({ title: 'Profile photo updated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to upload photo', description: 'Please try a JPG, PNG, or WebP image under 5 MB.', variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardContent className="flex flex-col items-center pt-8 pb-6">
            <div className="relative mb-4 group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={resolvePhotoUrl(user.photoUrl)} alt={initials} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading
                  ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                  : <Camera className="h-5 w-5 text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => { handlePhotoUpload(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
            </div>
            <h2 className="text-lg font-semibold">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-2">
              {ROLE_LABELS[user.role as UserRole] || user.role}
            </Badge>
            <Separator className="my-6 w-full" />
            <Button variant="outline" className="w-full" onClick={() => navigate('/change-password')}>
              <KeyRound className="h-4 w-4" /> Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2"><Mail className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2"><Shield className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">{ROLE_LABELS[user.role as UserRole] || user.role}</p>
                </div>
              </div>
              {user.employeeId && (
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2"><Hash className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="text-sm font-medium">{user.employeeId}</p>
                  </div>
                </div>
              )}
              {user.departmentId && (
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2"><Building2 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">
                      {typeof user.departmentId === 'object'
                        ? (user.departmentId as unknown as { name: string }).name
                        : user.departmentId}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
