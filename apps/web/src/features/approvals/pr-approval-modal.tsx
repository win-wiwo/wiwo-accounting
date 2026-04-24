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
  ATTACHMENT_CATEGORY_LABELS,
  AttachmentCategory,
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
  const quotationAttachments = (pr?.attachments ?? []).filter((att) => att.category === AttachmentCategory.CANVASS);
  const supportingAttachments = (pr?.attachments ?? []).filter((att) => att.category !== AttachmentCategory.CANVASS);

  const reviewBanner = {
    title: 'Approval Review Workspace',
    description: 'Check requester context first, then validate Procurement pricing support before making a final decision.',
    tone: 'border-blue-300 bg-blue-50 text-blue-900',
  };

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
                  <div className={`rounded-xl border px-4 py-3 ${reviewBanner.tone}`}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-white/80 p-2">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{reviewBanner.title}</p>
                        <p className="text-sm leading-6 text-current/80">{reviewBanner.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Stage</p>
                      <p className="mt-1 text-sm font-semibold">{PR_STATUS_LABELS[pr.status as PrStatusType]}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote Files</p>
                      <p className="mt-1 text-lg font-semibold">{quotationAttachments.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Requester Docs</p>
                      <p className="mt-1 text-lg font-semibold">{supportingAttachments.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Approval History</p>
                      <p className="mt-1 text-lg font-semibold">{approvalHistory.length}</p>
                    </div>
                  </div>

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
                    <div className="space-y-3">
                      {pr.items.map((item, i) => {
                        const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                        const displayPrice = isProcurement
                          ? (item.quotedUnitPrice ?? 0)
                          : (item.estimatedPrice ?? 0);
                        const unitPriceLabel = isProcurement && !item.quotedUnitPrice
                          ? 'Pending quotation'
                          : formatCurrency(displayPrice);

                        return (
                          <div key={item._id} className="rounded-xl border bg-background p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                                  {isProcurement ? (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5">
                                      <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                    </Badge>
                                  ) : (
                                    <Badge variant="info" className="text-[10px] px-1 py-0">Online</Badge>
                                  )}
                                </div>
                                <p className="text-base font-semibold leading-snug">{item.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[260px]">
                                <div className="rounded-lg bg-muted/40 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Qty</p>
                                  <p className="text-sm font-semibold">{item.quantity} {item.unit}</p>
                                </div>
                                <div className="rounded-lg bg-muted/40 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unit Price</p>
                                  <p className="text-sm font-semibold">{unitPriceLabel}</p>
                                </div>
                                <div className="col-span-2 rounded-lg bg-muted/40 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Line Total</p>
                                  <p className="text-base font-semibold">{item.totalPrice > 0 ? formatCurrency(item.totalPrice) : 'TBQ'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.referencePhotoPath && (
                                <button
                                  type="button"
                                  onClick={() => handleViewItemPhoto(item._id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                >
                                  <Camera className="h-3 w-3" />
                                  Reference photo
                                </button>
                              )}
                              {typeof item.selectedSupplierId === 'object' && item.selectedSupplierId?.companyName && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                  Supplier: {item.selectedSupplierId.companyName}
                                </span>
                              )}
                            </div>

                            {(item.specifications || item.notes) && (
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {item.specifications && (
                                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Specifications</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.specifications}</p>
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {!isProcurement && item.sellerReferences && item.sellerReferences.length > 0 && (
                              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-blue-700">Seller References</p>
                                <div className="mt-2 space-y-1.5">
                                  {item.sellerReferences.map((ref, ri) => (
                                    <div key={ri} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                      <span className="truncate">{ref.sellerName}</span>
                                      <span className="shrink-0 font-medium">{formatCurrency(ref.price)}</span>
                                    </div>
                                  ))}
                                </div>
                                {item.sellerReferencesJustification && (
                                  <p className="mt-2 flex items-start gap-1 text-xs text-amber-700">
                                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                    <span>{item.sellerReferencesJustification}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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

                  {pr.canvassEntries && pr.canvassEntries.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Canvass Comparison ({pr.canvassEntries.length})
                          </p>
                          {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                            <Badge variant="warning">Fewer than 3 justified</Badge>
                          )}
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          {pr.canvassEntries.map((entry) => (
                            <div
                              key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                              className={`rounded-lg border p-4 space-y-3 shadow-sm ${entry.isSelected ? 'border-emerald-400 bg-white ring-1 ring-emerald-200' : 'bg-white/80'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">{entry.supplierName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Total quoted: {formatCurrency(entry.totalQuotedAmount)}
                                  </p>
                                </div>
                                {entry.isSelected && <Badge variant="success">Selected</Badge>}
                              </div>
                              <div className="space-y-1">
                                {entry.quotedItems.map((quotedItem) => (
                                  <div key={quotedItem.itemId} className="flex items-center justify-between gap-3 text-xs">
                                    <span className="truncate">{quotedItem.description}</span>
                                    <span className="font-medium">{formatCurrency(quotedItem.unitPrice)}</span>
                                  </div>
                                ))}
                              </div>
                              {entry.remarks && (
                                <p className="text-xs text-muted-foreground italic">{entry.remarks}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-medium text-amber-800">Fewer than 3 suppliers justification</p>
                            <p className="mt-1 text-sm text-amber-900">{pr.canvassJustification}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Quotation Evidence */}
                  {quotationAttachments.length > 0 && (
                    <>
                      <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Quotation Evidence ({quotationAttachments.length})
                    </p>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Procurement-owned pricing basis: supplier quotations, canvass sheets, and comparison support for the selected supplier.
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                          {quotationAttachments.map((att) => (
                            <div key={att._id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <span className="block text-sm truncate">{att.originalName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {ATTACHMENT_CATEGORY_LABELS[att.category ?? AttachmentCategory.OTHER]}
                                  </span>
                                </div>
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

                  {/* Supporting Docs */}
                  {supportingAttachments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Supporting Documents ({supportingAttachments.length})
                        </p>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          Requester-owned context files such as memos, brochures, technical specs, and requester-supplied proposals.
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {supportingAttachments.map((att) => (
                            <div key={att._id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <span className="block text-sm truncate">{att.originalName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {ATTACHMENT_CATEGORY_LABELS[att.category ?? AttachmentCategory.OTHER]}
                                  </span>
                                </div>
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
                <div className="w-72 shrink-0 border-l bg-muted/10 overflow-y-auto p-4 space-y-4">
                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground">Workflow History</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Review the sequence of procurement and approval actions before deciding.
                    </p>
                    <div className="mt-4">
                      <PurchaseRequestWorkflowTimeline
                        pr={pr}
                        approvalHistory={approvalHistory}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer — action area */}
          <div className="border-t px-6 py-4 shrink-0">
            {confirmStep === null ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  Confirm the request context, then compare the procurement basis before approving, returning, or rejecting.
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
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
                  <div className="flex flex-wrap items-center gap-2 pb-0.5">
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
