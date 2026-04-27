import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Send,
  CheckCircle,
  Package,
  XCircle,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { UserRole } from '@prams/shared';
import {
  usePurchaseOrder,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useIssuePurchaseOrder,
  useCancelPurchaseOrder,
} from '@/hooks/use-purchase-orders';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
  Surface,
  StatusBadge,
  EmptyState,
  PrimaryButton,
  GhostButton,
  type BadgeTone,
} from '@/components/premium';

const PO_STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  approved:  'Approved',
  issued:    'Issued',
  cancelled: 'Cancelled',
};

const PO_STATUS_TONE: Record<string, BadgeTone> = {
  draft:     'gray',
  submitted: 'info',
  approved:  'success',
  issued:    'indigo',
  cancelled: 'danger',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  purchase_request: 'Purchase Request',
  job_request:      'Job Request',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = usePurchaseOrder(id!);
  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const issueMutation = useIssuePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const po = data?.data;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'submit' | 'approve' | 'issue';
  }>({ open: false, type: 'submit' });

  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleConfirm = async () => {
    if (!po) return;
    try {
      if (confirmDialog.type === 'submit') {
        await submitMutation.mutateAsync(po._id);
        toast({ title: 'PO submitted for approval', variant: 'success' });
      } else if (confirmDialog.type === 'approve') {
        await approveMutation.mutateAsync(po._id);
        toast({ title: 'PO approved', variant: 'success' });
      } else if (confirmDialog.type === 'issue') {
        await issueMutation.mutateAsync(po._id);
        toast({ title: 'PO issued', variant: 'success' });
      }
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleCancel = async () => {
    if (!po || !cancelReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'error' });
      return;
    }
    try {
      await cancelMutation.mutateAsync({ id: po._id, reason: cancelReason.trim() });
      toast({ title: 'PO cancelled', variant: 'success' });
    } catch {
      toast({ title: 'Failed to cancel', variant: 'error' });
    }
    setCancelDialog(false);
    setCancelReason('');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Surface><div className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </div></Surface>
            <Surface><div className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div></Surface>
          </div>
          <Surface><div className="p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </div></Surface>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <PageHeader
          title="Purchase Order"
          description="The requested PO could not be loaded."
          actions={
            <GhostButton onClick={() => navigate('/purchase-orders')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
          }
        />
        <Surface>
          <EmptyState
            icon={<FileText />}
            title="Purchase order not found"
            description="It may have been removed or the link is incorrect."
            action={
              <GhostButton onClick={() => navigate('/purchase-orders')}>
                Back to Purchase Orders
              </GhostButton>
            }
          />
        </Surface>
      </div>
    );
  }

  const isProcurementOrAdmin =
    user?.role === UserRole.PROCUREMENT || user?.role === UserRole.ADMIN;
  const isApprover =
    user?.role === UserRole.COO ||
    user?.role === UserRole.CEO ||
    user?.role === UserRole.ADMIN;

  const isDraft = po.status === 'draft';
  const isSubmitted = po.status === 'submitted';
  const isApproved = po.status === 'approved';
  const isCancelled = po.status === 'cancelled';

  const canEdit = isDraft && isProcurementOrAdmin;
  const canSubmit = isDraft && isProcurementOrAdmin;
  const canApprove = isSubmitted && isApprover;
  const canIssue = isApproved && isProcurementOrAdmin;
  const canCancel = (isDraft || isSubmitted || isApproved) && isProcurementOrAdmin;

  // Extract populated references
  const creator =
    po.createdBy && typeof po.createdBy === 'object'
      ? (po.createdBy as { _id: string; firstName: string; lastName: string; email: string })
      : null;
  const approver =
    po.approvedBy && typeof po.approvedBy === 'object'
      ? (po.approvedBy as { _id: string; firstName: string; lastName: string })
      : null;
  const supplier =
    po.supplierId && typeof po.supplierId === 'object'
      ? (po.supplierId as { _id: string; name?: string; companyName?: string })
      : null;
  const sourceRequest =
    po.purchaseRequestId && typeof po.purchaseRequestId === 'object'
      ? (po.purchaseRequestId as { _id: string; prNumber?: string; title?: string })
      : null;

  const supplierName = supplier?.name || supplier?.companyName || '—';
  const sourceNumber = po.sourceRequestNumber || sourceRequest?.prNumber || '—';
  const sourceTypeLabel = SOURCE_TYPE_LABELS[po.sourceRequestType] || po.sourceRequestType;

  const confirmLabels = {
    submit: {
      title: 'Submit Purchase Order',
      description:
        'Submit this PO for approval? It will be routed to the appropriate approver.',
      button: 'Submit',
    },
    approve: {
      title: 'Approve Purchase Order',
      description:
        'Approve this purchase order? Once approved, it can be issued to the supplier.',
      button: 'Approve',
    },
    issue: {
      title: 'Issue Purchase Order',
      description:
        'Issue this purchase order to the supplier? This marks the PO as officially issued.',
      button: 'Issue',
    },
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={po.poNumber || 'Draft Purchase Order'}
        description={po.projectName ? `Project: ${po.projectName}` : `${sourceTypeLabel} ${sourceNumber}`}
        meta={
          <StatusBadge tone={PO_STATUS_TONE[po.status] ?? 'gray'}>
            {PO_STATUS_LABELS[po.status] || po.status}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <GhostButton onClick={() => navigate('/purchase-orders')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
            {canEdit && (
              <GhostButton onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </GhostButton>
            )}
            {canCancel && (
              <GhostButton
                onClick={() => {
                  setCancelReason('');
                  setCancelDialog(true);
                }}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </GhostButton>
            )}
            {canSubmit && (
              <PrimaryButton onClick={() => setConfirmDialog({ open: true, type: 'submit' })}>
                <Send className="h-3.5 w-3.5" /> Submit
              </PrimaryButton>
            )}
            {canApprove && (
              <PrimaryButton onClick={() => setConfirmDialog({ open: true, type: 'approve' })}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </PrimaryButton>
            )}
            {canIssue && (
              <PrimaryButton onClick={() => setConfirmDialog({ open: true, type: 'issue' })}>
                <Package className="h-3.5 w-3.5" /> Issue
              </PrimaryButton>
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
          {/* Source Request */}
          <Surface>
            <PanelHeader
              icon={<FileText className="h-4 w-4 text-zinc-400" />}
              title="Source Request"
            />
            <div className="px-6 pb-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Request Number" value={sourceNumber} mono />
                <Field label="Source Type" value={sourceTypeLabel} />
                {sourceRequest?.title && (
                  <div className="sm:col-span-2">
                    <Field label="Title" value={sourceRequest.title} />
                  </div>
                )}
              </div>
            </div>
          </Surface>

          {/* Line Items */}
          <Surface>
            <PanelHeader title="Line Items" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/95 border-b border-zinc-100">
                  <tr>
                    <th className="h-11 px-5 w-10 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">#</th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Description</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Qty</th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Unit</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Unit Price</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map(
                    (item: { _id: string; description: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; notes?: string }, i: number) => (
                      <tr key={item._id || i} className="border-b border-zinc-100/60 last:border-0 hover:bg-zinc-50/60 transition-colors duration-150">
                        <td className="px-5 py-4 text-[12px] text-zinc-400 tabular-nums">{i + 1}</td>
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-zinc-800">{item.description}</p>
                          {item.notes && (
                            <p className="text-[12px] text-zinc-400 mt-0.5">{item.notes}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-[13px] text-zinc-700 tabular-nums">{item.quantity}</td>
                        <td className="px-5 py-4 text-[13px] text-zinc-500">{item.unit}</td>
                        <td className="px-5 py-4 text-right text-[13px] text-zinc-700 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-5 py-4 text-right text-[13px] font-semibold text-zinc-900 tabular-nums">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-zinc-100 px-6 py-4">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Total Amount</p>
                <p className="mt-1.5 text-[24px] font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(po.totalAmount)}
                </p>
              </div>
            </div>
          </Surface>

          {/* Canvass Entries */}
          {po.canvassEntries && po.canvassEntries.length > 0 && (
            <Surface>
              <PanelHeader title="Canvass Entries" />
              <div className="px-6 pb-6 space-y-3">
                {po.canvassEntries.map(
                  (entry: { _id: string; supplierName: string; totalQuotedAmount: number; isSelected: boolean; remarks: string }) => (
                    <div
                      key={entry._id}
                      className={`rounded-xl border p-4 transition-colors duration-150 ${
                        entry.isSelected
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-zinc-100 hover:border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-900 truncate">
                            {entry.supplierName}
                          </p>
                          <p className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
                            Total Quoted: {formatCurrency(entry.totalQuotedAmount)}
                          </p>
                          {entry.remarks && (
                            <p className="mt-1 text-[12px] italic text-zinc-400">{entry.remarks}</p>
                          )}
                        </div>
                        {entry.isSelected && (
                          <StatusBadge tone="success">Selected</StatusBadge>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Surface>
          )}

          {/* Cancellation Reason */}
          {isCancelled && po.cancellationReason && (
            <Surface className="border-red-200 bg-red-50/30">
              <PanelHeader title="Cancellation Reason" />
              <div className="px-6 pb-6">
                <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {po.cancellationReason}
                </p>
              </div>
            </Surface>
          )}

          {/* Remarks */}
          {po.remarks && (
            <Surface>
              <PanelHeader title="Remarks" />
              <div className="px-6 pb-6">
                <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {po.remarks}
                </p>
              </div>
            </Surface>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Status & Amount */}
          <Surface elevation="subtle">
            <div className="p-6 space-y-4">
              <div>
                <SidebarLabel>Total Amount</SidebarLabel>
                <p className="mt-2 text-[24px] font-bold text-zinc-900 tabular-nums leading-none">
                  {formatCurrency(po.totalAmount)}
                </p>
                <p className="mt-1 text-[12px] text-zinc-400">
                  {po.currency || 'PHP'}
                </p>
              </div>
            </div>
          </Surface>

          {/* Supplier */}
          <Surface elevation="subtle">
            <div className="p-6">
              <SidebarLabel>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3" /> Supplier
                </span>
              </SidebarLabel>
              <p className="mt-2 text-[13px] font-semibold text-zinc-900">{supplierName}</p>
            </div>
          </Surface>

          {/* Metadata */}
          <Surface elevation="subtle">
            <div className="p-6 space-y-5">
              <div>
                <SidebarLabel>Created By</SidebarLabel>
                <p className="mt-2 text-[13px] font-medium text-zinc-900">
                  {creator ? `${creator.firstName} ${creator.lastName}` : '—'}
                </p>
              </div>
              <Divider />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SidebarLabel>Created</SidebarLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-800 tabular-nums">
                    {formatDate(po.createdAt)}
                  </p>
                </div>
                <div>
                  <SidebarLabel>Updated</SidebarLabel>
                  <p className="mt-1.5 text-[13px] font-medium text-zinc-800 tabular-nums">
                    {formatDate(po.updatedAt)}
                  </p>
                </div>
              </div>
              {approver && (
                <>
                  <Divider />
                  <div>
                    <SidebarLabel>Approved By</SidebarLabel>
                    <p className="mt-2 text-[13px] font-medium text-zinc-900">
                      {approver.firstName} {approver.lastName}
                    </p>
                    <p className="text-[12px] text-zinc-400 mt-0.5 tabular-nums">
                      {formatDateTime(po.approvedAt)}
                    </p>
                  </div>
                </>
              )}
              {po.issuedAt && (
                <>
                  <Divider />
                  <div>
                    <SidebarLabel>Issued</SidebarLabel>
                    <p className="mt-2 text-[13px] font-medium text-zinc-900 tabular-nums">
                      {formatDateTime(po.issuedAt)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Surface>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmLabels[confirmDialog.type].title}</DialogTitle>
            <DialogDescription>
              {confirmLabels[confirmDialog.type].description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <PrimaryButton onClick={handleConfirm}>
              {confirmLabels[confirmDialog.type].button}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog
        open={cancelDialog}
        onOpenChange={(open) => {
          setCancelDialog(open);
          if (!open) setCancelReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              This purchase order will be permanently cancelled. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="cancel-reason"
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
              placeholder="Why is this PO being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialog(false);
                setCancelReason('');
              }}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
            >
              <XCircle className="h-4 w-4" /> Cancel PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[13px] text-zinc-800 ${mono ? 'font-mono' : 'font-medium'}`}
      >
        {value}
      </p>
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
