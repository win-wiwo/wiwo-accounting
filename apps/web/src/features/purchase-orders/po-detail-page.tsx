import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Send, CheckCircle, Package, XCircle, ShoppingCart, FileText } from 'lucide-react';
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
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  purchase_request: 'Purchase Request',
  job_request: 'Job Request',
};

const statusVariant = (status: string) => {
  switch (status) {
    case 'draft': return 'secondary' as const;
    case 'submitted': return 'info' as const;
    case 'approved': return 'success' as const;
    case 'issued': return 'default' as const;
    case 'cancelled': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!po) {
    return <EmptyState title="Purchase order not found" />;
  }

  const isProcurementOrAdmin = user?.role === UserRole.PROCUREMENT || user?.role === UserRole.ADMIN;
  const isApprover = user?.role === UserRole.COO || user?.role === UserRole.CEO || user?.role === UserRole.ADMIN;

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
  const creator = po.createdBy && typeof po.createdBy === 'object'
    ? (po.createdBy as { _id: string; firstName: string; lastName: string; email: string })
    : null;
  const approver = po.approvedBy && typeof po.approvedBy === 'object'
    ? (po.approvedBy as { _id: string; firstName: string; lastName: string })
    : null;
  const supplier = po.supplierId && typeof po.supplierId === 'object'
    ? (po.supplierId as { _id: string; name?: string; companyName?: string })
    : null;
  const sourceRequest = po.purchaseRequestId && typeof po.purchaseRequestId === 'object'
    ? (po.purchaseRequestId as { _id: string; prNumber?: string; title?: string })
    : null;

  const supplierName = supplier?.name || supplier?.companyName || '\u2014';
  const sourceNumber = po.sourceRequestNumber || sourceRequest?.prNumber || '\u2014';
  const sourceTypeLabel = SOURCE_TYPE_LABELS[po.sourceRequestType] || po.sourceRequestType;

  const confirmLabels = {
    submit: { title: 'Submit Purchase Order', description: 'Submit this PO for approval? It will be routed to the appropriate approver.', button: 'Submit' },
    approve: { title: 'Approve Purchase Order', description: 'Approve this purchase order? Once approved, it can be issued to the supplier.', button: 'Approve' },
    issue: { title: 'Issue Purchase Order', description: 'Issue this purchase order to the supplier? This marks the PO as officially issued.', button: 'Issue' },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber || 'Draft Purchase Order'}
        description={po.projectName ? `Project: ${po.projectName}` : undefined}
      >
        <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
        {canSubmit && (
          <Button onClick={() => setConfirmDialog({ open: true, type: 'submit' })}>
            <Send className="h-4 w-4" /> Submit
          </Button>
        )}
        {canApprove && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setConfirmDialog({ open: true, type: 'approve' })}
          >
            <CheckCircle className="h-4 w-4" /> Approve
          </Button>
        )}
        {canIssue && (
          <Button onClick={() => setConfirmDialog({ open: true, type: 'issue' })}>
            <Package className="h-4 w-4" /> Issue
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => { setCancelReason(''); setCancelDialog(true); }}
          >
            <XCircle className="h-4 w-4" /> Cancel PO
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Source Request Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Source Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Request Number</p>
                  <p className="mt-1 text-sm font-medium">{sourceNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Source Type</p>
                  <p className="mt-1 text-sm font-medium">{sourceTypeLabel}</p>
                </div>
                {sourceRequest?.title && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Title</p>
                    <p className="mt-1 text-sm">{sourceRequest.title}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items.map((item: { _id: string; description: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; notes?: string }, i: number) => (
                    <TableRow key={item._id || i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium">{item.description}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex justify-end p-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(po.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvass Entries */}
          {po.canvassEntries && po.canvassEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Canvass Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {po.canvassEntries.map((entry: { _id: string; supplierName: string; totalQuotedAmount: number; isSelected: boolean; remarks: string }) => (
                    <div
                      key={entry._id}
                      className={`rounded-lg border p-4 ${entry.isSelected ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{entry.supplierName}</p>
                          <p className="text-sm text-muted-foreground">
                            Total Quoted: {formatCurrency(entry.totalQuotedAmount)}
                          </p>
                          {entry.remarks && (
                            <p className="mt-1 text-xs text-muted-foreground italic">{entry.remarks}</p>
                          )}
                        </div>
                        {entry.isSelected && (
                          <Badge variant="success">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Reason */}
          {isCancelled && po.cancellationReason && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Cancellation Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{po.cancellationReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          {po.remarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{po.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Status & Amounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status & Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Badge variant={statusVariant(po.status)} className="mt-1">
                  {PO_STATUS_LABELS[po.status] || po.status}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(po.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Currency</p>
                <p className="mt-1 text-sm font-medium">{po.currency || 'PHP'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{supplierName}</p>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created By</p>
                <p className="mt-1 text-sm font-medium">
                  {creator ? `${creator.firstName} ${creator.lastName}` : '\u2014'}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(po.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(po.updatedAt)}</p>
                </div>
              </div>
              {approver && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Approved By</p>
                    <p className="mt-1 text-sm font-medium">
                      {approver.firstName} {approver.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(po.approvedAt)}</p>
                  </div>
                </>
              )}
              {po.issuedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Issued At</p>
                    <p className="mt-1 text-sm font-medium">{formatDateTime(po.issuedAt)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog (Submit/Approve/Issue) */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmLabels[confirmDialog.type].title}</DialogTitle>
            <DialogDescription>{confirmLabels[confirmDialog.type].description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button
              className={confirmDialog.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : undefined}
              onClick={handleConfirm}
            >
              {confirmLabels[confirmDialog.type].button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog open={cancelDialog} onOpenChange={(open) => { setCancelDialog(open); if (!open) setCancelReason(''); }}>
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
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Why is this PO being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelDialog(false); setCancelReason(''); }}>
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
