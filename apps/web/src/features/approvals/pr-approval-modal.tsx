import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  User,
  Building2,
  Paperclip,
  Download,
  ExternalLink,
  AlertCircle,
  ShoppingCart,
  ChevronRight,
  Hash,
  Eye,
  Camera,
  ImageIcon,
  FileText,
} from 'lucide-react';
import {
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  SourcingType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePurchaseRequest } from '@/hooks/use-purchase-requests';
import { useApprovalHistory, useProcessApproval } from '@/hooks/use-approvals';
import { purchaseRequestsApi } from '@/lib/api-services';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { PurchaseRequestWorkflowTimeline } from '@/components/purchase-request-workflow-timeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function canPreviewAttachment(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'submitted':
    case 'level1_review':
    case 'level2_review':
    case 'level3_review':
      return 'info' as const;
    case 'approved': return 'success' as const;
    case 'rejected': return 'destructive' as const;
    case 'returned':
    case 'returned_for_info':
      return 'warning' as const;
    default: return 'secondary' as const;
  }
};

const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'info' as const;
    default: return 'secondary' as const;
  }
};

interface PrApprovalModalProps {
  /** Ordered list of PR IDs in the queue */
  prIds: string[];
  /** Index of the currently viewed PR */
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when moving to a different index */
  onNavigate: (index: number) => void;
}

export function PrApprovalModal({
  prIds,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: PrApprovalModalProps) {
  const prId = prIds[currentIndex] ?? null;
  const hasNext = currentIndex < prIds.length - 1;

  const { toast } = useToast();
  const processApproval = useProcessApproval();

  const { data, isLoading } = usePurchaseRequest(prId ?? '');
  const { data: historyData } = useApprovalHistory(prId ?? '');

  const pr = data?.data;
  const approvalHistory = historyData?.data ?? [];

  const [confirmStep, setConfirmStep] = useState<'approved' | 'rejected' | 'returned' | null>(null);
  const [comments, setComments] = useState('');
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    url: string | null;
    mimeType: string;
    name: string;
    loading: boolean;
  }>({ open: false, url: null, mimeType: '', name: '', loading: false });
  const [itemPhotoDialog, setItemPhotoDialog] = useState<{
    open: boolean;
    url: string | null;
    loading: boolean;
  }>({ open: false, url: null, loading: false });

  const requester = pr?.requesterId as unknown as {
    firstName: string; lastName: string; email: string; employeeId: string;
  } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;

  const handleAction = async () => {
    if (!pr || !confirmStep) return;
    if ((confirmStep === 'rejected' || confirmStep === 'returned') && !comments.trim()) {
      toast({ title: 'Comments are required', variant: 'error' });
      return;
    }

    try {
      await processApproval.mutateAsync({
        purchaseRequestId: pr._id,
        action: confirmStep,
        comments: comments.trim(),
      });

      const labels = { approved: 'approved', rejected: 'rejected', returned: 'returned for revision' };
      toast({
        title: `PR ${labels[confirmStep]}`,
        variant: confirmStep === 'approved' ? 'success' : 'default',
      });

      setConfirmStep(null);
      setComments('');

      if (hasNext) {
        onNavigate(currentIndex + 1);
      } else {
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Action failed';
      toast({ title: msg, variant: 'error' });
    }
  };

  const startAction = (action: 'approved' | 'rejected' | 'returned') => {
    setComments('');
    setConfirmStep(action);
  };

  const cancelAction = () => {
    setConfirmStep(null);
    setComments('');
  };

  const handlePreviewAttachment = async (
    attachmentId: string,
    mimeType: string,
    name: string,
  ) => {
    if (!pr) return;

    setPreviewDialog({ open: true, url: null, mimeType, name, loading: true });
    try {
      const response = await apiClient.get(
        `/purchase-requests/${pr._id}/attachments/${attachmentId}/download`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(
        new Blob([response.data], { type: mimeType }),
      );
      setPreviewDialog({
        open: true,
        url: blobUrl,
        mimeType,
        name,
        loading: false,
      });
    } catch {
      setPreviewDialog({ open: false, url: null, mimeType: '', name: '', loading: false });
      toast({ title: 'Failed to load attachment', variant: 'error' });
    }
  };

  const closePreviewDialog = () => {
    if (previewDialog.url) {
      URL.revokeObjectURL(previewDialog.url);
    }
    setPreviewDialog({ open: false, url: null, mimeType: '', name: '', loading: false });
  };

  const handleViewItemPhoto = async (itemId: string) => {
    if (!pr) return;

    setItemPhotoDialog({ open: true, url: null, loading: true });
    try {
      const blob = await purchaseRequestsApi.fetchItemPhoto(pr._id, itemId);
      const url = URL.createObjectURL(blob);
      setItemPhotoDialog({ open: true, url, loading: false });
    } catch {
      setItemPhotoDialog({ open: false, url: null, loading: false });
      toast({ title: 'Failed to load photo', variant: 'error' });
    }
  };

  const closeItemPhotoDialog = () => {
    if (itemPhotoDialog.url) {
      URL.revokeObjectURL(itemPhotoDialog.url);
    }
    setItemPhotoDialog({ open: false, url: null, loading: false });
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={(v) => {
        if (!v) {
          setConfirmStep(null);
          setComments('');
          closePreviewDialog();
          closeItemPhotoDialog();
        }
        onOpenChange(v);
      }}>
        <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-5xl h-[88vh] flex flex-col rounded-xl border bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogPrimitive.Title className="sr-only">Review Purchase Request</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Review and take action on this purchase request</DialogPrimitive.Description>

          {/* Header */}
          <div className="flex items-start justify-between border-b px-6 py-4 shrink-0">
            {isLoading || !pr ? (
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">{pr.prNumber}</span>
                  <Badge variant={statusVariant(pr.status)}>
                    {PR_STATUS_LABELS[pr.status as PrStatusType]}
                  </Badge>
                  <Badge variant={priorityVariant(pr.priority)}>
                    {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                  </Badge>
                </div>
                <h2 className="mt-1 text-lg font-semibold leading-snug">{pr.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {department?.name ?? '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Needed by {formatDate(pr.neededByDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Submitted {formatDate(pr.submittedAt)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {prIds.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {prIds.length}
                </span>
              )}
              <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex">
            {isLoading ? (
              <div className="flex-1 p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : pr ? (
              <>
                {/* Main content — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pr.description && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{pr.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Purpose</p>
                      <p className="text-sm">{pr.justification}</p>
                    </div>
                    {pr.projectId && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Project</p>
                        <p className="text-sm">
                          {(pr.projectId as unknown as { name: string; code: string | null }).name}
                          {(pr.projectId as unknown as { code: string | null }).code && (
                            <span className="ml-1.5 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {(pr.projectId as unknown as { code: string | null }).code}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Line Items */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Line Items</p>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8 text-center">#</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right w-16">Qty</TableHead>
                            <TableHead className="text-right w-32">Unit Price</TableHead>
                            <TableHead className="text-right w-32">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pr.items.map((item, i) => {
                            const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                            const displayPrice = isProcurement
                              ? (item.quotedUnitPrice ?? 0)
                              : (item.estimatedPrice ?? 0);
                            return (
                              <TableRow key={item._id}>
                                <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <span className="font-medium text-sm">{item.description}</span>
                                    {isProcurement ? (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5">
                                        <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                      </Badge>
                                    ) : (
                                      <Badge variant="info" className="text-[10px] px-1 py-0">Online</Badge>
                                    )}
                                  </div>
                                  {item.specifications && (
                                    <p className="text-xs text-muted-foreground">{item.specifications}</p>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                                  )}
                                  {item.referencePhotoPath && (
                                    <button
                                      type="button"
                                      onClick={() => handleViewItemPhoto(item._id)}
                                      className="mt-0.5 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      <Camera className="h-3 w-3" />
                                      Reference photo
                                    </button>
                                  )}
                                  {!isProcurement && item.sellerReferences && item.sellerReferences.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {item.sellerReferences.map((ref, ri) => (
                                        <div key={ri} className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <span>{ref.sellerName} — {formatCurrency(ref.price)}</span>
                                          {ref.url && (
                                            <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                      {item.sellerReferencesJustification && (
                                        <p className="text-xs text-amber-700 flex items-center gap-1">
                                          <AlertCircle className="h-3 w-3 shrink-0" />
                                          {item.sellerReferencesJustification}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {isProcurement && !item.quotedUnitPrice
                                    ? <span className="text-muted-foreground text-xs">Pending</span>
                                    : formatCurrency(displayPrice)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {item.totalPrice > 0
                                    ? formatCurrency(item.totalPrice)
                                    : <span className="text-muted-foreground text-xs">TBQ</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end pt-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">{formatCurrency(pr.totalAmount)}</p>
                        {pr.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT && !i.quotedUnitPrice) && (
                          <p className="text-xs text-amber-600">* Some items pending quotation</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {pr.attachments && pr.attachments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Attachments ({pr.attachments.length})
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {(pr.attachments as Array<{ _id: string; originalName: string; mimeType: string; size: number }>).map((att) => (
                            <div key={att._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{att.originalName}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {(att.size / 1024).toFixed(0)} KB
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {canPreviewAttachment(att.mimeType) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="View"
                                    onClick={() => handlePreviewAttachment(att._id, att.mimeType, att.originalName)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Download"
                                  onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right sidebar — approval history */}
                <div className="w-64 shrink-0 border-l overflow-y-auto p-4 space-y-4">
                  <p className="text-xs font-medium text-muted-foreground">Workflow History</p>
                  <PurchaseRequestWorkflowTimeline
                    pr={pr}
                    approvalHistory={approvalHistory}
                    compact
                  />
                </div>
              </>
            ) : null}
          </div>

          {/* Footer — action area */}
          <div className="border-t px-6 py-4 shrink-0">
            {confirmStep === null ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Review the details above before taking action.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => startAction('rejected')}
                    disabled={!pr || processApproval.isPending}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startAction('returned')}
                    disabled={!pr || processApproval.isPending}
                  >
                    <RotateCcw className="h-4 w-4" /> Return for Revision
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => startAction('approved')}
                    disabled={!pr || processApproval.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {hasNext ? 'Approve & Next' : 'Approve'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {confirmStep === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {confirmStep === 'rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                  {confirmStep === 'returned' && <RotateCcw className="h-4 w-4 text-amber-600" />}
                  <p className="text-sm font-medium">
                    {confirmStep === 'approved' && 'Approving this purchase request'}
                    {confirmStep === 'rejected' && 'Rejecting this purchase request'}
                    {confirmStep === 'returned' && 'Returning for revision'}
                  </p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="modal-comments" className="text-xs">
                      Comments
                      {confirmStep !== 'approved' && <span className="text-destructive"> *</span>}
                    </Label>
                    <textarea
                      id="modal-comments"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder={confirmStep === 'approved' ? 'Optional comments...' : 'Provide a reason (required)...'}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    <Button variant="outline" onClick={cancelAction} disabled={processApproval.isPending}>
                      Cancel
                    </Button>
                    <Button
                      variant={confirmStep === 'approved' ? 'default' : confirmStep === 'rejected' ? 'destructive' : 'outline'}
                      className={confirmStep === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : undefined}
                      onClick={handleAction}
                      disabled={processApproval.isPending}
                    >
                      {confirmStep === 'approved' && (
                        hasNext
                          ? <><CheckCircle2 className="h-4 w-4" /> Approve & Next <ChevronRight className="h-3.5 w-3.5" /></>
                          : <><CheckCircle2 className="h-4 w-4" /> Confirm Approval</>
                      )}
                      {confirmStep === 'rejected' && <><XCircle className="h-4 w-4" /> Confirm Rejection</>}
                      {confirmStep === 'returned' && <><RotateCcw className="h-4 w-4" /> Confirm Return</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => {
          if (!open) closePreviewDialog();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previewDialog.name || 'Attachment Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {previewDialog.loading ? (
              <Skeleton className="h-[70vh] w-full rounded-md" />
            ) : previewDialog.url && previewDialog.mimeType === 'application/pdf' ? (
              <iframe
                src={previewDialog.url}
                title={previewDialog.name}
                className="h-[70vh] w-full rounded-md border"
              />
            ) : previewDialog.url ? (
              <img
                src={previewDialog.url}
                alt={previewDialog.name}
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemPhotoDialog.open}
        onOpenChange={(open) => {
          if (!open) closeItemPhotoDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {itemPhotoDialog.loading ? (
              <Skeleton className="h-[60vh] w-full rounded-md" />
            ) : itemPhotoDialog.url ? (
              <img
                src={itemPhotoDialog.url}
                alt="Reference photo"
                className="max-h-[60vh] max-w-full rounded-md object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
