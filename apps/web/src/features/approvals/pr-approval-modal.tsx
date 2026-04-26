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
  ShoppingCart,
  ChevronRight,
  Hash,
  Eye,
  Camera,
  ImageIcon,
  FileText,
  Clock,
} from 'lucide-react';
import {
  ATTACHMENT_CATEGORY_LABELS,
  AttachmentCategory,
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  PrStatus,
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

const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'info' as const;
    default: return 'secondary' as const;
  }
};

interface PrApprovalModalProps {
  prIds: string[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    open: boolean; url: string | null; mimeType: string; name: string; loading: boolean;
  }>({ open: false, url: null, mimeType: '', name: '', loading: false });
  const [itemPhotoDialog, setItemPhotoDialog] = useState<{
    open: boolean; url: string | null; loading: boolean;
  }>({ open: false, url: null, loading: false });

  const requester = pr?.requesterId as unknown as {
    firstName: string; lastName: string; email: string; employeeId: string;
  } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;
  const quotationAttachments = (pr?.attachments ?? []).filter((att) => att.category === AttachmentCategory.CANVASS);
  const supportingAttachments = (pr?.attachments ?? []).filter((att) => att.category !== AttachmentCategory.CANVASS);
  const isPriceReview = pr?.status === PrStatus.QUOTED;
  const procurementItems = pr?.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? [];
  const hasProcurementItems = procurementItems.length > 0;
  const hasUnquotedItems = procurementItems.some((i) => !i.quotedUnitPrice);

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

  const handlePreviewAttachment = async (attachmentId: string, mimeType: string, name: string) => {
    if (!pr) return;
    setPreviewDialog({ open: true, url: null, mimeType, name, loading: true });
    try {
      const response = await apiClient.get(
        `/purchase-requests/${pr._id}/attachments/${attachmentId}/download`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      setPreviewDialog({ open: true, url: blobUrl, mimeType, name, loading: false });
    } catch {
      setPreviewDialog({ open: false, url: null, mimeType: '', name: '', loading: false });
      toast({ title: 'Failed to load attachment', variant: 'error' });
    }
  };

  const closePreviewDialog = () => {
    if (previewDialog.url) URL.revokeObjectURL(previewDialog.url);
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
    if (itemPhotoDialog.url) URL.revokeObjectURL(itemPhotoDialog.url);
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{pr.prNumber}</span>
                    <Badge variant={priorityVariant(pr.priority)} className="text-xs">
                      {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                    </Badge>
                    {isPriceReview && (
                      <Badge variant="info" className="text-xs">Price Review</Badge>
                    )}
                    {hasProcurementItems && !isPriceReview && (
                      <Badge variant="secondary" className="text-xs gap-0.5">
                        <ShoppingCart className="h-3 w-3" /> Procurement
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold leading-snug">{pr.title}</h2>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {prIds.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {prIds.length}
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
                  {/* Main content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Decision context banner */}
                    {isPriceReview ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-900">Price Review — validate supplier selection and costs</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {pr.canvassEntries?.length ?? 0} supplier{(pr.canvassEntries?.length ?? 0) !== 1 ? 's' : ''} canvassed. Approve to finalise, or return to procurement for revised quotes.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                        <p className="text-sm font-semibold text-blue-900">
                          {PR_STATUS_LABELS[pr.status as PrStatusType]} — you are approving the business need
                        </p>
                        {hasProcurementItems && (
                          <p className="text-xs text-blue-700 mt-0.5">
                            Pricing is not final yet. Procurement will source suppliers after full management sign-off.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Purpose + Total — the two things that matter most */}
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-1">
                        <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Purpose</p>
                        <p className="text-sm leading-relaxed">{pr.justification}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-col items-end justify-center gap-0.5 min-w-[140px]">
                        <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Total</p>
                        {hasProcurementItems && hasUnquotedItems && !isPriceReview ? (
                          <>
                            <p className="text-lg font-bold text-amber-600">Pending Quote</p>
                            <p className="text-[10px] text-muted-foreground">Prices set after procurement</p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold tabular-nums">{formatCurrency(pr.totalAmount)}</p>
                        )}
                      </div>
                    </div>

                    {pr.description && (
                      <p className="text-sm text-muted-foreground">{pr.description}</p>
                    )}

                    {pr.projectId && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">Project</span>
                        <span className="font-medium">
                          {(pr.projectId as unknown as { name: string; code: string | null }).name}
                        </span>
                        {(pr.projectId as unknown as { code: string | null }).code && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {(pr.projectId as unknown as { code: string | null }).code}
                          </span>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Line Items */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Line Items ({pr.items.length})
                      </p>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8">#</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Item</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-20">Qty</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Unit Price</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Total</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {pr.items.map((item, i) => {
                              const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                              const displayPrice = isProcurement
                                ? (item.quotedUnitPrice ?? item.estimatedPrice ?? 0)
                                : (item.estimatedPrice ?? 0);
                              const isPending = isProcurement && !item.quotedUnitPrice;

                              return (
                                <tr key={item._id} className="border-b last:border-0">
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-start gap-2">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-sm leading-snug">{item.description}</p>
                                        {item.specifications && (
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.specifications}</p>
                                        )}
                                      </div>
                                      {isProcurement && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5 shrink-0 mt-0.5">
                                          <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                        </Badge>
                                      )}
                                    </div>
                                    {typeof item.selectedSupplierId === 'object' && item.selectedSupplierId?.companyName && (
                                      <p className="text-[11px] text-emerald-700 mt-1">Supplier: {item.selectedSupplierId.companyName}</p>
                                    )}
                                    {!isProcurement && item.sellerReferences && item.sellerReferences.length > 0 && (
                                      <div className="mt-1.5 space-y-0.5">
                                        {item.sellerReferences.map((ref, ri) => (
                                          <p key={ri} className="text-[11px] text-muted-foreground">
                                            {ref.sellerName} — {formatCurrency(ref.price)}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                                    {isPending ? (
                                      <span className="text-amber-600 italic">TBQ</span>
                                    ) : (
                                      formatCurrency(displayPrice)
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                    {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {item.referencePhotoPath && (
                                      <button
                                        type="button"
                                        onClick={() => handleViewItemPhoto(item._id)}
                                        title="View reference photo"
                                        className="text-blue-500 hover:text-blue-700"
                                      >
                                        <Camera className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Canvass comparison — prominent for price review */}
                    {pr.canvassEntries && pr.canvassEntries.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Supplier Comparison ({pr.canvassEntries.length})
                            </p>
                            {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                              <Badge variant="warning" className="text-xs">Fewer than 3 justified</Badge>
                            )}
                          </div>
                          <div className="rounded-lg border overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/40">
                                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Supplier</th>
                                  {pr.canvassEntries[0]?.quotedItems.map((qi) => (
                                    <th key={qi.itemId} className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                                      {qi.description}
                                    </th>
                                  ))}
                                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pr.canvassEntries.map((entry) => (
                                  <tr
                                    key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                                    className={`border-b last:border-0 ${entry.isSelected ? 'bg-emerald-50/60' : ''}`}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{entry.supplierName}</span>
                                        {entry.isSelected && (
                                          <Badge variant="success" className="text-[10px] px-1.5 py-0">Selected</Badge>
                                        )}
                                      </div>
                                      {entry.remarks && (
                                        <p className="text-xs text-muted-foreground italic mt-0.5">{entry.remarks}</p>
                                      )}
                                    </td>
                                    {entry.quotedItems.map((qi) => (
                                      <td key={qi.itemId} className="px-3 py-2 text-right text-xs">
                                        {formatCurrency(qi.unitPrice)}
                                      </td>
                                    ))}
                                    <td className="px-3 py-2 text-right font-semibold">
                                      {formatCurrency(entry.totalQuotedAmount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {pr.canvassJustification && pr.canvassEntries.length < 3 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="text-xs font-medium text-amber-800">Fewer than 3 suppliers — justification</p>
                              <p className="mt-0.5 text-sm text-amber-900">{pr.canvassJustification}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Quotation evidence files */}
                    {quotationAttachments.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Quotation Evidence ({quotationAttachments.length})
                          </p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {quotationAttachments.map((att) => (
                              <AttachmentRow
                                key={att._id}
                                att={att}
                                prId={pr._id}
                                onPreview={handlePreviewAttachment}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Supporting docs */}
                    {supportingAttachments.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Supporting Documents ({supportingAttachments.length})
                          </p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {supportingAttachments.map((att) => (
                              <AttachmentRow
                                key={att._id}
                                att={att}
                                prId={pr._id}
                                onPreview={handlePreviewAttachment}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                  </div>

                  {/* Right sidebar */}
                  <div className="w-64 shrink-0 border-l overflow-y-auto p-4 space-y-4">
                    {/* Requester card */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requester</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{department?.name ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                          <span>{requester?.employeeId ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>Submitted {formatDate(pr.submittedAt)}</span>
                        </div>
                        {pr.neededByDate && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Needed by {formatDate(pr.neededByDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Workflow history */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Workflow History
                      </p>
                      {approvalHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No actions yet.</p>
                      ) : (
                        <PurchaseRequestWorkflowTimeline
                          pr={pr}
                          approvalHistory={approvalHistory}
                          compact
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer — action area */}
            <div className="border-t px-6 py-4 shrink-0 bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {confirmStep === null ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {isPriceReview ? 'Approve pricing or return to procurement' : 'Take action on this request'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPriceReview
                        ? 'Approve confirms the supplier selection and cost. Return sends it back for revised quotes.'
                        : 'Returning sends it back to the requester for revision. Rejecting ends the request.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => startAction('rejected')}
                      disabled={!pr || processApproval.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startAction('returned')}
                      disabled={!pr || processApproval.isPending}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isPriceReview ? 'Return to Procurement' : 'Return for Revision'}
                    </Button>
                    <div className="flex flex-col items-end gap-0.5">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => startAction('approved')}
                        disabled={!pr || processApproval.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {hasNext ? 'Approve & Next' : isPriceReview ? 'Approve Pricing' : 'Approve'}
                      </Button>
                      {hasProcurementItems && !isPriceReview && (
                        <p className="text-[10px] text-muted-foreground">Approves the need — pricing follows procurement</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {confirmStep === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {confirmStep === 'rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                    {confirmStep === 'returned' && <RotateCcw className="h-4 w-4 text-amber-600" />}
                    <p className="text-sm font-medium">
                      {confirmStep === 'approved' && (isPriceReview ? 'Approving pricing' : 'Approving this request')}
                      {confirmStep === 'rejected' && 'Rejecting this request'}
                      {confirmStep === 'returned' && (isPriceReview ? 'Returning to procurement' : 'Returning for revision')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="modal-comments" className="text-xs">
                        Comments
                        {confirmStep !== 'approved' && <span className="text-destructive"> *</span>}
                      </Label>
                      <textarea
                        id="modal-comments"
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder={confirmStep === 'approved' ? 'Optional comments...' : 'Required — provide a reason...'}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5 shrink-0">
                      <Button variant="outline" size="sm" onClick={cancelAction} disabled={processApproval.isPending}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant={confirmStep === 'approved' ? 'default' : confirmStep === 'rejected' ? 'destructive' : 'outline'}
                        className={confirmStep === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : undefined}
                        onClick={handleAction}
                        disabled={processApproval.isPending}
                      >
                        {confirmStep === 'approved' && (
                          hasNext
                            ? <><CheckCircle2 className="h-4 w-4" /> Approve & Next <ChevronRight className="h-3.5 w-3.5" /></>
                            : <><CheckCircle2 className="h-4 w-4" /> Confirm</>
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

      {/* Attachment preview dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => { if (!open) closePreviewDialog(); }}>
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
              <iframe src={previewDialog.url} title={previewDialog.name} className="h-[70vh] w-full rounded-md border" />
            ) : previewDialog.url ? (
              <img src={previewDialog.url} alt={previewDialog.name} className="max-h-[70vh] max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item photo dialog */}
      <Dialog open={itemPhotoDialog.open} onOpenChange={(open) => { if (!open) closeItemPhotoDialog(); }}>
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
              <img src={itemPhotoDialog.url} alt="Reference photo" className="max-h-[60vh] max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AttachmentRow({
  att,
  prId,
  onPreview,
}: {
  att: { _id: string; originalName: string; mimeType: string; category?: string | null };
  prId: string;
  onPreview: (id: string, mimeType: string, name: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <span className="block text-sm truncate">{att.originalName}</span>
          <span className="text-xs text-muted-foreground">
            {ATTACHMENT_CATEGORY_LABELS[att.category as keyof typeof ATTACHMENT_CATEGORY_LABELS] ?? att.category}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canPreviewAttachment(att.mimeType) && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(att._id, att.mimeType, att.originalName)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => purchaseRequestsApi.downloadAttachment(prId, att._id, att.originalName)}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
