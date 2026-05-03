import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  Paperclip,
  Download,
  Eye,
  Camera,
  ImageIcon,
  FileText,
  AlertTriangle,
  Check,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  ATTACHMENT_CATEGORY_LABELS,
  AttachmentCategory,
  PR_PRIORITY_LABELS,
  PrStatus,
  SourcingType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePurchaseRequest } from '@/hooks/use-purchase-requests';
import { useApprovalHistory, useProcessApproval } from '@/hooks/use-approvals';
import { PurchaseRequestWorkflowTimeline } from '@/components/purchase-request-workflow-timeline';
import { purchaseRequestsApi } from '@/lib/api-services';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolvePhotoUrl } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function canPreviewAttachment(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function daysPast(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const priorityStyle: Record<string, string> = {
  low:    'bg-tone-neutral-bg text-tone-neutral-text',
  medium: 'bg-tone-info-bg text-tone-info-text',
  high:   'bg-tone-warning-bg text-tone-warning-text',
  urgent: 'bg-tone-danger-bg text-tone-danger-text',
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
  const [expandedSellers, setExpandedSellers] = useState<Record<number, boolean>>({});

  const requester = pr?.requesterId as unknown as {
    firstName: string; lastName: string; email: string; employeeId: string; photoUrl?: string | null;
  } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;
  const quotationAttachments = (pr?.attachments ?? []).filter((att) => att.category === AttachmentCategory.CANVASS);
  const supportingAttachments = (pr?.attachments ?? []).filter((att) => att.category !== AttachmentCategory.CANVASS);
  const isPriceReview = pr?.status === PrStatus.QUOTED;
  const procurementItems = pr?.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? [];
  const hasProcurementItems = procurementItems.length > 0;
  const hasUnquotedItems = procurementItems.some((i) => !i.quotedUnitPrice);
  const isOverdue = pr?.neededByDate ? daysPast(pr.neededByDate) > 0 : false;

  // Supplier comparison stats
  const canvassEntries = pr?.canvassEntries ?? [];
  const selectedSupplier = canvassEntries.find((e) => e.isSelected);
  const lowestTotal = canvassEntries.length > 0
    ? Math.min(...canvassEntries.map((e) => e.totalQuotedAmount))
    : 0;
  const highestTotal = canvassEntries.length > 0
    ? Math.max(...canvassEntries.map((e) => e.totalQuotedAmount))
    : 0;

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

      const toastConfig = {
        approved: {
          title: 'Purchase Request Approved',
          description: 'Moved to the next approval stage',
          variant: 'success' as const,
        },
        rejected: {
          title: 'Purchase Request Rejected',
          description: 'The requester has been notified',
          variant: 'error' as const,
        },
        returned: {
          title: 'Returned for Revision',
          description: 'The requester will update and resubmit',
          variant: 'warning' as const,
        },
      };
      toast(toastConfig[confirmStep]);

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
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content onOpenAutoFocus={(e) => e.preventDefault()} className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[94vw] max-w-[1200px] h-[90vh] flex flex-col rounded-2xl border border-zinc-200/80 bg-white shadow-modal duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden">
            <DialogPrimitive.Title className="sr-only">Review Purchase Request</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Review and take action on this purchase request</DialogPrimitive.Description>

            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-4 shrink-0 bg-white">
              {isLoading || !pr ? (
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-label font-medium text-zinc-400 tracking-tight">{pr.prNumber}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold ${priorityStyle[pr.priority] ?? 'bg-tone-neutral-bg text-tone-neutral-text'}`}>
                      {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                    </span>
                    {isPriceReview && (
                      <span className="inline-flex items-center rounded-full bg-tone-success-bg px-2 py-0.5 text-micro font-semibold text-tone-success-text">
                        Price Review
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-heading-sm font-bold leading-snug text-zinc-900 tracking-[-0.01em]">{pr.title}</h2>
                </div>
              )}
              <div className="flex items-center gap-3 shrink-0">
                {prIds.length > 1 && (
                  <span className="text-caption text-zinc-400 tabular-nums">
                    {currentIndex + 1} of {prIds.length}
                  </span>
                )}
                <DialogPrimitive.Close className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-150">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* ── Body: Split workspace ─────────────────────── */}
            <div className="flex-1 overflow-hidden flex">
              {isLoading || !pr ? (
                <div className="flex-1 p-8 space-y-5">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : (
                <>
                  {/* ── Main content (~70%) ──────────────────── */}
                  <div className="flex-1 overflow-y-auto scrollbar-modern px-7 py-5 space-y-4">

                    {/* Summary strip */}
                    <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 px-5 py-3 flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-0.5">Purpose</p>
                        <p className="text-label leading-relaxed text-zinc-800 line-clamp-2">{pr.justification}</p>
                        {pr.projectId && (
                          <p className="text-caption text-zinc-500 mt-1 flex items-center gap-1.5">
                            <span className="text-zinc-400">Project:</span>
                            <span className="font-medium text-zinc-700">
                              {(pr.projectId as unknown as { name: string; code: string | null }).name}
                            </span>
                            {(pr.projectId as unknown as { code: string | null }).code && (
                              <span className="font-mono text-micro bg-zinc-100 text-zinc-500 px-1 py-px rounded">
                                {(pr.projectId as unknown as { code: string | null }).code}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="h-8 w-px bg-zinc-200/60 shrink-0 hidden sm:block" />
                      <div className="text-right shrink-0">
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-0.5">Total</p>
                        {hasProcurementItems && hasUnquotedItems && !isPriceReview ? (
                          <p className="text-body-lg font-bold text-amber-600">Pending Quote</p>
                        ) : (
                          <p className="text-heading-sm font-bold tabular-nums text-zinc-900 tracking-tight">{formatCurrency(pr.totalAmount)}</p>
                        )}
                      </div>
                      {pr.neededByDate && (
                        <>
                          <div className="h-8 w-px bg-zinc-200/60 shrink-0 hidden sm:block" />
                          <div className="text-right shrink-0">
                            <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-0.5">Needed by</p>
                            <p className={`text-body font-semibold ${isOverdue ? 'text-red-500' : 'text-zinc-800'}`}>
                              {formatDate(pr.neededByDate)}
                              {isOverdue && <span className="text-micro ml-1 text-red-500 font-medium">(overdue)</span>}
                            </p>
                          </div>
                        </>
                      )}
                      <div className="h-8 w-px bg-zinc-200/60 shrink-0 hidden sm:block" />
                      <div className="text-right shrink-0">
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-0.5">Items</p>
                        <p className="text-body font-semibold text-zinc-800 tabular-nums">{pr.items.length}</p>
                      </div>
                    </div>

                    {/* ── Line Items ──────────────────────────────── */}
                    <div className="rounded-xl border border-zinc-200/60 overflow-hidden">
                      <div className="px-4 py-3">
                        <span className="text-label font-semibold text-zinc-700">
                          {pr.items.length} Item{pr.items.length !== 1 ? 's' : ''} Requested
                        </span>
                      </div>
                      {(
                        <div className="border-t border-zinc-100">
                          {pr.items.map((item, i) => {
                            const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                            const displayPrice = isProcurement
                              ? (item.quotedUnitPrice ?? item.estimatedPrice ?? 0)
                              : (item.estimatedPrice ?? 0);
                            const isPending = isProcurement && !item.quotedUnitPrice;
                            const sellers = (!isProcurement && item.sellerReferences) || [];

                            return (
                              <div key={item._id} className={`${i > 0 ? 'border-t border-zinc-100/60' : ''}`}>
                                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-micro font-bold text-zinc-500 tabular-nums shrink-0">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-label font-medium text-zinc-800 truncate">{item.description}</p>
                                        {isProcurement && (
                                          <span className="inline-flex items-center text-micro font-semibold text-tone-info-text bg-tone-info-bg border border-blue-100 rounded-full px-1.5 py-0.5 shrink-0">Procurement</span>
                                        )}
                                        {item.referencePhotoPath && (
                                          <button type="button" onClick={(e) => { e.stopPropagation(); handleViewItemPhoto(item._id); }}
                                            className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 shrink-0">
                                            <Camera className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                      {item.specifications && (
                                        <p className="mt-1 text-caption text-zinc-500 leading-relaxed whitespace-pre-wrap break-words">
                                          {item.specifications}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-3 shrink-0 text-label tabular-nums">
                                    <span className="text-zinc-400">{item.quantity} {item.unit}</span>
                                    <span className="text-zinc-300">&middot;</span>
                                    {isPending
                                      ? <span className="text-amber-600 font-medium">TBQ</span>
                                      : <span className="text-zinc-500">@ {formatCurrency(displayPrice)}</span>}
                                    <span className="font-semibold text-zinc-800 min-w-[72px] text-right">
                                      {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : '\u2014'}
                                    </span>
                                  </div>
                                </div>

                                {/* Seller comparison (online items) */}
                                {sellers.length > 0 && (() => {
                                  const isExpanded = expandedSellers[i] ?? false;
                                  const selectedSeller = sellers.find((s) => s.price === item.estimatedPrice);
                                  return (
                                    <div className="border-t border-zinc-100/60 bg-zinc-50/40">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSellers((p) => ({ ...p, [i]: !p[i] }))}
                                        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-zinc-100/40 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                            Seller Comparison ({sellers.length})
                                          </p>
                                          {!isExpanded && selectedSeller && (
                                            <span className="flex items-center gap-1 text-micro text-emerald-600 font-medium">
                                              <Check className="h-3 w-3" />
                                              {selectedSeller.sellerName} &mdash; {formatCurrency(selectedSeller.price)}
                                            </span>
                                          )}
                                        </div>
                                        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                      {isExpanded && (
                                        <div className="px-4 pb-2.5 space-y-1.5">
                                          {sellers.map((ref, ri) => {
                                            const isSelected = ref.price === item.estimatedPrice;
                                            return (
                                              <div
                                                key={ri}
                                                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-caption transition-colors ${
                                                  isSelected
                                                    ? 'bg-emerald-50/80 border border-emerald-200/60'
                                                    : 'bg-white border border-zinc-100 hover:border-zinc-200'
                                                }`}
                                              >
                                                <span className={`flex h-4 w-4 items-center justify-center rounded-full shrink-0 ${
                                                  isSelected ? 'bg-emerald-500' : 'border border-zinc-200'
                                                }`}>
                                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <p className={`truncate leading-tight ${isSelected ? 'font-semibold text-zinc-800' : 'text-zinc-600'}`}>
                                                    {ref.sellerName}
                                                  </p>
                                                </div>
                                                <span className={`shrink-0 tabular-nums font-semibold ${isSelected ? 'text-emerald-700' : 'text-zinc-500'}`}>
                                                  {formatCurrency(ref.price)}
                                                </span>
                                                {ref.url && (
                                                  <a
                                                    href={ref.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex h-6 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-micro font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition-colors shrink-0"
                                                  >
                                                    View <ExternalLink className="h-2.5 w-2.5" />
                                                  </a>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {item.sellerReferencesJustification && (
                                            <div className="mt-1.5 rounded-lg border border-amber-200/60 bg-amber-50/50 px-2.5 py-2">
                                              <p className="text-micro font-semibold uppercase tracking-[0.08em] text-amber-700 mb-0.5">Justification</p>
                                              <p className="text-caption text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                                {item.sellerReferencesJustification}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ── Supplier Comparison ───────────────────── */}
                    {canvassEntries.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400">
                              Supplier Comparison ({canvassEntries.length})
                            </p>
                            {selectedSupplier && (
                              <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                {selectedSupplier.supplierName} &mdash; {formatCurrency(selectedSupplier.totalQuotedAmount)}
                                {canvassEntries.length > 1 && selectedSupplier.totalQuotedAmount === lowestTotal && (
                                  <span className="text-micro font-medium text-emerald-600/80 ml-0.5">Lowest</span>
                                )}
                                {canvassEntries.length > 1 && highestTotal > selectedSupplier.totalQuotedAmount && (
                                  <span className="text-micro font-medium text-emerald-600 ml-1">
                                    (saves {formatCurrency(highestTotal - selectedSupplier.totalQuotedAmount)})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          {canvassEntries.length < 3 && pr.canvassJustification && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-tone-warning-bg px-2 py-0.5 text-micro font-semibold text-tone-warning-text">
                              <AlertTriangle className="h-2.5 w-2.5" /> &lt;3 suppliers
                            </span>
                          )}
                        </div>

                        {/* Comparison table */}
                        <div className="rounded-xl border border-zinc-200/60 overflow-hidden">
                          <table className="w-full text-label">
                            <thead>
                              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                                <th className="text-left px-3 py-2 text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400">Supplier</th>
                                {canvassEntries[0]?.quotedItems.map((qi) => (
                                  <th key={qi.itemId} className="text-right px-3 py-2 text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 max-w-[100px]" title={qi.description}>
                                    <span className="block truncate">{qi.description}</span>
                                  </th>
                                ))}
                                <th className="text-right px-3 py-2 text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {canvassEntries.map((entry) => (
                                <tr
                                  key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                                  className={`border-b border-zinc-100/60 last:border-0 transition-colors duration-100 ${entry.isSelected ? 'bg-emerald-50/30' : 'hover:bg-zinc-50/60'}`}
                                >
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-label font-medium text-zinc-800">{entry.supplierName}</span>
                                      {entry.isSelected && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-micro font-semibold text-emerald-700">Selected</span>
                                      )}
                                      {!entry.isSelected && canvassEntries.length > 1 && entry.totalQuotedAmount === lowestTotal && (
                                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-micro font-medium text-zinc-500">Lowest</span>
                                      )}
                                    </div>
                                    {entry.remarks && (
                                      <p className="text-micro text-zinc-400 italic mt-0.5 line-clamp-1">{entry.remarks}</p>
                                    )}
                                    {(() => {
                                      const entryEvidence = quotationAttachments.filter((att) => att.canvassEntryId === entry._id);
                                      if (entryEvidence.length === 0) return null;
                                      return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {entryEvidence.map((att) => (
                                            <div key={att._id} className="inline-flex items-center gap-1 rounded-md border border-zinc-100 bg-zinc-50/80 px-1.5 py-0.5 text-micro text-zinc-500">
                                              <Paperclip className="h-2.5 w-2.5 text-zinc-300" />
                                              <span className="truncate max-w-[100px]">{att.originalName}</span>
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                {canPreviewAttachment(att.mimeType) && (
                                                  <button onClick={() => handlePreviewAttachment(att._id, att.mimeType, att.originalName)}
                                                    className="h-4 w-4 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                                                    <Eye className="h-2.5 w-2.5" />
                                                  </button>
                                                )}
                                                <button onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}
                                                  className="h-4 w-4 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                                                  <Download className="h-2.5 w-2.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  {entry.quotedItems.map((qi) => (
                                    <td key={qi.itemId} className="px-3 py-2.5 text-right text-label tabular-nums text-zinc-600">
                                      {formatCurrency(qi.unitPrice)}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2.5 text-right">
                                    <span className={`text-body font-semibold tabular-nums ${entry.isSelected ? 'text-emerald-700' : 'text-zinc-800'}`}>
                                      {formatCurrency(entry.totalQuotedAmount)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {pr.canvassJustification && canvassEntries.length < 3 && (
                          <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-3 mt-2">
                            <p className="text-caption font-semibold text-amber-800">Fewer than 3 suppliers &mdash; justification</p>
                            <p className="mt-1 text-label text-amber-900/80 leading-relaxed">{pr.canvassJustification}</p>
                          </div>
                        )}

                      </div>
                    )}

                    {supportingAttachments.length > 0 && (
                      <div>
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-3">
                          Supporting Documents ({supportingAttachments.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {supportingAttachments.map((att) => (
                            <AttachmentRow key={att._id} att={att} prId={pr._id} onPreview={handlePreviewAttachment} />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* ── Right panel (~30%) ──────────────────────── */}
                  <div className="w-[280px] shrink-0 border-l border-zinc-100 bg-zinc-50/30 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto scrollbar-modern px-5 py-5 space-y-4">

                      {/* Requester */}
                      <div>
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-2">Requester</p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage
                              src={resolvePhotoUrl(requester?.photoUrl)}
                              alt={requester ? `${requester.firstName} ${requester.lastName}` : undefined}
                            />
                            <AvatarFallback className="bg-white border border-zinc-200/80 text-zinc-500 text-label font-semibold">
                              {requester ? requester.firstName[0] : <User className="h-3.5 w-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-body font-semibold text-zinc-900 leading-tight truncate">
                              {requester ? `${requester.firstName} ${requester.lastName}` : '\u2014'}
                            </p>
                            <p className="text-caption text-zinc-400 truncate">{department?.name ?? '\u2014'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-zinc-200/60" />

                      {/* Workflow history — full vertical timeline */}
                      <div>
                        <p className="text-micro font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-3">
                          Workflow History
                        </p>
                        {!pr?.submittedAt && approvalHistory.length === 0 ? (
                          <p className="text-caption text-zinc-400">No actions yet.</p>
                        ) : pr ? (
                          <PurchaseRequestWorkflowTimeline
                            pr={pr}
                            approvalHistory={approvalHistory}
                            compact
                            showCurrentState={false}
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* ── Actions (always visible) ──────────────── */}
                    <div className="border-t border-zinc-200/60 bg-white px-5 py-4 shrink-0 shadow-up">
                      {confirmStep === null ? (
                        <div className="space-y-2.5">
                          <button
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl h-10 text-body font-semibold text-white bg-emerald-600 transition-all duration-200 hover:bg-emerald-700 hover:-translate-y-px hover:shadow-card disabled:opacity-50 disabled:pointer-events-none"
                            onClick={() => startAction('approved')}
                            disabled={!pr || processApproval.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {isPriceReview ? 'Approve Pricing' : 'Approve'}
                          </button>
                          {hasProcurementItems && !isPriceReview && (
                            <p className="text-micro text-zinc-400 text-center -mt-1">Approves the need &mdash; pricing follows procurement</p>
                          )}

                          <div className="flex gap-2">
                            <button
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl h-9 text-label font-medium text-zinc-500 bg-transparent transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 disabled:pointer-events-none"
                              onClick={() => startAction('returned')}
                              disabled={!pr || processApproval.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Return
                            </button>
                            <button
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl h-9 text-label font-medium text-red-500/80 bg-transparent transition-all duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:pointer-events-none"
                              onClick={() => startAction('rejected')}
                              disabled={!pr || processApproval.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {confirmStep === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                            {confirmStep === 'rejected' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                            {confirmStep === 'returned' && <RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                            <p className="text-label font-semibold text-zinc-800">
                              {confirmStep === 'approved' && (isPriceReview ? 'Approving pricing' : 'Approving request')}
                              {confirmStep === 'rejected' && 'Rejecting request'}
                              {confirmStep === 'returned' && (isPriceReview ? 'Returning to procurement' : 'Returning for revision')}
                            </p>
                          </div>
                          <div>
                            <label htmlFor="modal-comments" className="text-caption font-medium text-zinc-500 block mb-1">
                              Comments
                              {confirmStep !== 'approved' && <span className="text-red-500"> *</span>}
                            </label>
                            <textarea
                              id="modal-comments"
                              rows={3}
                              className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-label text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-focus resize-none"
                              placeholder={confirmStep === 'approved' ? 'Optional comments...' : 'Required \u2014 provide a reason...'}
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl h-9 text-label font-medium text-zinc-600 border border-zinc-200 bg-white transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50"
                              onClick={cancelAction}
                              disabled={processApproval.isPending}
                            >
                              Cancel
                            </button>
                            <button
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl h-9 text-label font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${
                                confirmStep === 'approved'
                                  ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                                  : confirmStep === 'rejected'
                                    ? 'text-white bg-red-600 hover:bg-red-700'
                                    : 'text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50'
                              }`}
                              onClick={handleAction}
                              disabled={processApproval.isPending}
                            >
                              {confirmStep === 'approved' && (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm</>
                              )}
                              {confirmStep === 'rejected' && <><XCircle className="h-3.5 w-3.5" /> Confirm</>}
                              {confirmStep === 'returned' && <><RotateCcw className="h-3.5 w-3.5" /> Confirm</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Attachment preview dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(v) => { if (!v) closePreviewDialog(); }}>
        <DialogContent className="max-w-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previewDialog.name || 'Attachment Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-[70vh] bg-zinc-50 rounded-md photo-reveal">
            {previewDialog.loading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : previewDialog.url && previewDialog.mimeType === 'application/pdf' ? (
              <iframe src={previewDialog.url} title={previewDialog.name} className="h-full w-full rounded-md border" />
            ) : previewDialog.url ? (
              <img src={previewDialog.url} alt={previewDialog.name} className="max-h-full max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item photo dialog */}
      <Dialog open={itemPhotoDialog.open} onOpenChange={(v) => { if (!v) closeItemPhotoDialog(); }}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-[60vh] bg-zinc-50 rounded-md photo-reveal">
            {itemPhotoDialog.loading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : itemPhotoDialog.url ? (
              <img src={itemPhotoDialog.url} alt="Reference photo" className="max-h-full max-w-full rounded-md object-contain" />
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
    <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 px-3.5 py-2.5 transition-all duration-150 hover:border-zinc-200 hover:shadow-card">
      <div className="flex items-center gap-2.5 min-w-0">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
        <div className="min-w-0">
          <span className="block text-label font-medium text-zinc-800 truncate">{att.originalName}</span>
          <span className="text-micro text-zinc-400">
            {ATTACHMENT_CATEGORY_LABELS[att.category as keyof typeof ATTACHMENT_CATEGORY_LABELS] ?? att.category}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canPreviewAttachment(att.mimeType) && (
          <button
            onClick={() => onPreview(att._id, att.mimeType, att.originalName)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-150"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => purchaseRequestsApi.downloadAttachment(prId, att._id, att.originalName)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-150"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
