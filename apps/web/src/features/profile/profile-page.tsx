import { useRef, useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Mail,
  Building2,
  Shield,
  Hash,
  Camera,
  Loader2,
} from 'lucide-react';
import { ROLE_LABELS, type UserRole, type User } from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/lib/api-services';
import { useToast } from '@/components/ui/toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolvePhotoUrl } from '@/lib/utils';
import {
  PageHeader,
  Surface,
  StatusBadge,
  GhostButton,
  type BadgeTone,
} from '@/components/premium';

const ROLE_TONE: Record<string, BadgeTone> = {
  admin:       'neutral',
  ceo:         'danger',
  coo:         'warn',
  dept_head:   'info',
  procurement: 'violet',
  accounting:  'indigo',
  staff:       'gray',
};

export function ProfilePage() {
  usePageTitle('Profile');
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
      toast({
        title: 'Failed to upload photo',
        description: 'Please try a JPG, PNG, or WebP image under 5 MB.',
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader title="My Profile" description="Your account details and security." />

      <div
        className="pr-list-section grid gap-6 lg:grid-cols-3"
        style={{ animationDelay: '0.04s' }}
      >
        {/* Profile Card */}
        <Surface>
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            <div className="relative mb-4 group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={resolvePhotoUrl(user.photoUrl)} alt={initials} />
                <AvatarFallback className="bg-zinc-100 text-zinc-700 text-[20px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  handlePhotoUpload(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </div>
            <h2 className="text-[16px] font-semibold text-zinc-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">{user.email}</p>
            <div className="mt-3">
              <StatusBadge tone={ROLE_TONE[user.role] ?? 'neutral'}>
                {ROLE_LABELS[user.role as UserRole] || user.role}
              </StatusBadge>
            </div>
            <div className="my-6 h-px w-full bg-zinc-100" />
            <GhostButton
              className="w-full"
              onClick={() => navigate('/change-password')}
            >
              <KeyRound className="h-3.5 w-3.5" /> Change Password
            </GhostButton>
          </div>
        </Surface>

        {/* Details */}
        <Surface className="lg:col-span-2">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[15px] font-semibold text-zinc-900">Account Details</h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
              <DetailRow
                icon={<Shield className="h-4 w-4" />}
                label="Role"
                value={ROLE_LABELS[user.role as UserRole] || user.role}
              />
              {user.employeeId && (
                <DetailRow
                  icon={<Hash className="h-4 w-4" />}
                  label="Employee ID"
                  value={user.employeeId}
                  mono
                />
              )}
              {user.departmentId && (
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Department"
                  value={
                    typeof user.departmentId === 'object'
                      ? (user.departmentId as unknown as { name: string }).name
                      : (user.departmentId as string)
                  }
                />
              )}
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-zinc-100 p-2 text-zinc-500 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
          {label}
        </p>
        <p
          className={`mt-1 text-[13px] text-zinc-800 truncate ${mono ? 'font-mono' : 'font-medium'}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
