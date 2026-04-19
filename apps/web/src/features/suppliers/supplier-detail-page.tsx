import { useNavigate, useParams } from 'react-router-dom';
import { Building, Phone, Mail, CreditCard, ArrowLeft, Pencil } from 'lucide-react';
import { UserRole } from '@prams/shared';
import { useSupplier } from '@/hooks/use-suppliers';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';

function formatDate(d: string | null | undefined) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success' as const;
    case 'inactive': return 'secondary' as const;
    case 'blacklisted': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'blacklisted': return 'Blacklisted';
    default: return status;
  }
};

const taxTypeLabel = (taxType: string) => {
  switch (taxType) {
    case 'vat': return 'VAT';
    case 'non_vat': return 'Non-VAT';
    default: return taxType;
  }
};

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useSupplier(id!);
  const supplier = data?.data;

  const canEdit =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.ACCOUNTING ||
    user?.role === UserRole.PROCUREMENT;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return <EmptyState title="Supplier not found" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.companyName}
        description={`TIN: ${supplier.tin}`}
      >
        <Button variant="outline" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/suppliers/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </PageHeader>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="h-4 w-4" /> Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Company Name</p>
                  <p className="mt-1 text-sm font-medium">{supplier.companyName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">TIN</p>
                  <p className="mt-1 text-sm font-mono">{supplier.tin}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tax Type</p>
                  <p className="mt-1 text-sm font-medium">{taxTypeLabel(supplier.taxType)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Payment Terms</p>
                  <p className="mt-1 text-sm">{supplier.paymentTerms || '\u2014'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Address</p>
                <p className="mt-1 text-sm">{supplier.address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Contact Person</p>
                  <p className="mt-1 text-sm font-medium">{supplier.contactPerson || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Contact Number</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {supplier.contactNumber ? (
                      <>
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{supplier.contactNumber}</span>
                      </>
                    ) : (
                      <span className="text-sm">{'\u2014'}</span>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {supplier.email ? (
                      <>
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{supplier.email}</span>
                      </>
                    ) : (
                      <span className="text-sm">{'\u2014'}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" /> Banking Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Bank Account Name</p>
                  <p className="mt-1 text-sm font-medium">{supplier.bankAccountName || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Bank Account Number</p>
                  <p className="mt-1 text-sm font-mono">{supplier.bankAccountNumber || '\u2014'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Bank Name</p>
                  <p className="mt-1 text-sm">{supplier.bankName || '\u2014'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={statusVariant(supplier.status)} className="text-sm">
                {statusLabel(supplier.status)}
              </Badge>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {supplier.notes || <span className="text-muted-foreground">No notes</span>}
              </p>
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created By</p>
                <p className="mt-1 text-sm font-medium">
                  {supplier.createdBy
                    ? `${supplier.createdBy.firstName} ${supplier.createdBy.lastName}`
                    : '\u2014'}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(supplier.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(supplier.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
