import { useNavigate, useParams } from 'react-router-dom';
import { Building, Phone, Mail, CreditCard, ArrowLeft, Pencil } from 'lucide-react';
import { UserRole } from '@prams/shared';
import { useSupplier } from '@/hooks/use-suppliers';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageHeader,
  Surface,
  StatusBadge,
  EmptyState,
  GhostButton,
  type BadgeTone,
} from '@/components/premium';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active:      'success',
  inactive:    'gray',
  blacklisted: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  active:      'Active',
  inactive:    'Inactive',
  blacklisted: 'Blacklisted',
};

function taxTypeLabel(taxType: string) {
  if (taxType === 'vat') return 'VAT';
  if (taxType === 'non_vat') return 'Non-VAT';
  return taxType;
}

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useSupplier(id!);
  const supplier = data?.data;

  const canEdit = (
    [UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT] as string[]
  ).includes(user?.role ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Surface>
              <div className="p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Surface>
            <Surface>
              <div className="p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Surface>
          </div>
          <Surface>
            <div className="p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <PageHeader
          title="Supplier"
          description="The requested supplier could not be loaded."
          actions={
            <GhostButton onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
          }
        />
        <Surface>
          <EmptyState
            icon={<Building />}
            title="Supplier not found"
            description="It may have been removed or the link is incorrect."
            action={
              <GhostButton onClick={() => navigate('/suppliers')}>
                Back to Suppliers
              </GhostButton>
            }
          />
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={supplier.companyName}
        description={`TIN: ${supplier.tin}`}
        meta={
          <StatusBadge tone={STATUS_TONE[supplier.status] ?? 'gray'}>
            {STATUS_LABEL[supplier.status] ?? supplier.status}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
            {canEdit && (
              <GhostButton onClick={() => navigate(`/suppliers/${id}/edit`)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </GhostButton>
            )}
          </div>
        }
      />

      <div
        className="pr-list-section grid gap-6 lg:grid-cols-[1fr_320px]"
        style={{ animationDelay: '0.06s' }}
      >
        {/* ── Left column ─────────────────────────────────────── */}
        <div className="space-y-6">
          <Surface>
            <PanelHeader icon={<Building className="h-4 w-4 text-zinc-400" />} title="Company Information" />
            <div className="px-6 pb-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Company Name" value={supplier.companyName} />
                <Field label="TIN" value={supplier.tin} mono />
                <Field label="Tax Type" value={taxTypeLabel(supplier.taxType)} />
                <Field label="Payment Terms" value={supplier.paymentTerms || '—'} />
              </div>
              <Divider />
              <Field label="Address" value={supplier.address} />
            </div>
          </Surface>

          <Surface>
            <PanelHeader icon={<Phone className="h-4 w-4 text-zinc-400" />} title="Contact Information" />
            <div className="px-6 pb-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Contact Person" value={supplier.contactPerson || '—'} />
                <Field
                  label="Contact Number"
                  value={supplier.contactNumber || '—'}
                  icon={supplier.contactNumber ? <Phone className="h-3.5 w-3.5 text-zinc-400" /> : null}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Email"
                    value={supplier.email || '—'}
                    icon={supplier.email ? <Mail className="h-3.5 w-3.5 text-zinc-400" /> : null}
                  />
                </div>
              </div>
            </div>
          </Surface>

          <Surface>
            <PanelHeader icon={<CreditCard className="h-4 w-4 text-zinc-400" />} title="Banking Information" />
            <div className="px-6 pb-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Bank Account Name" value={supplier.bankAccountName || '—'} />
                <Field label="Bank Account Number" value={supplier.bankAccountNumber || '—'} mono />
                <div className="sm:col-span-2">
                  <Field label="Bank Name" value={supplier.bankName || '—'} />
                </div>
              </div>
            </div>
          </Surface>
        </div>

        {/* ── Right column ────────────────────────────────────── */}
        <div className="space-y-6">
          <Surface elevation="subtle">
            <div className="p-6">
              <SidebarLabel>Notes</SidebarLabel>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {supplier.notes || (
                  <span className="italic text-zinc-400">No notes</span>
                )}
              </p>
            </div>
          </Surface>

          <Surface elevation="subtle">
            <div className="p-6 space-y-5">
              <div>
                <SidebarLabel>Created By</SidebarLabel>
                <p className="mt-2 text-[13px] font-medium text-zinc-900">
                  {supplier.createdBy
                    ? `${supplier.createdBy.firstName} ${supplier.createdBy.lastName}`
                    : '—'}
                </p>
              </div>
              <Divider />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SidebarLabel>Created</SidebarLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-800 tabular-nums">
                    {formatDate(supplier.createdAt)}
                  </p>
                </div>
                <div>
                  <SidebarLabel>Updated</SidebarLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-800 tabular-nums">
                    {formatDate(supplier.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {icon}
        <p
          className={`text-[13px] text-zinc-800 ${mono ? 'font-mono' : 'font-medium'}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}
