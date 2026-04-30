import { useState, useRef } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Eye, CheckCircle2,
  Loader2, User,
  Paperclip, Download, Camera, ImageIcon, FileText, Upload, Trash2,
  Trophy, AlertTriangle, CheckCircle, XCircle,
  TrendingDown, Info, Save,
  FileSpreadsheet, FileImage, Send, MessageSquare,
} from 'lucide-react';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { AttachmentCategory, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequest } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate, canPreviewAttachment, getErrorMessage } from './utils';
import { useCanvass } from './use-canvass';
import { CanvassMatrix } from './canvass-matrix';

/* ── Helpers ─────────────────────────────────────────────── */

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fileTypeIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 shrink-0 text-red-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('.sheet'))
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4 shrink-0 text-blue-400" />;
  return <Paperclip className="h-4 w-4 shrink-0 text-zinc-400" />;
}

/* ── Main Page ───────────────────────────────────────────── */

export function ProcurementWorkspacePage() {
  usePageTitle('Procurement Workspace');
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, refetch } = usePurchaseRequest(id ?? '');
  const pr = data?.data;

  const procItems = pr?.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? [];
  const quotationAttachments = (pr?.attachments ?? []).filter((att) => att.category === AttachmentCategory.CANVASS);

  const requester = pr?.requesterId as unknown as { firstName: string; lastName: string; email: string; employeeId: string } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;

  const canvass = useCanvass(id, procItems, () => navigate('/procurement'));

  const [isUploadingQuoteFile, setIsUploadingQuoteFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; url: string | null; mimeType: string; name: string; loading: boolean }>({
    open: false, url: null, mimeType: '', name: '', loading: false,
  });
  const [itemPhotoDialog, setItemPhotoDialog] = useState<{ open: boolean; url: string | null; loading: boolean }>({
    open: false, url: null, loading: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadQuotationEvidence = async (file: File | null) => {
    if (!file || !pr) return;
    try {
      setIsUploadingQuoteFile(true);
      await purchaseRequestsApi.uploadQuotationAttachment(pr._id, file);
      await refetch();
      toast({ title: 'Quotation evidence uploaded', variant: 'success' });
    } catch (error) {
      toast({ title: 'Failed to upload', description: getErrorMessage(error, 'Try again with a supported file type.'), variant: 'error' });
    } finally {
      setIsUploadingQuoteFile(false);
    }
  };

  const handleRemoveQuotationEvidence = async (attachmentId: string) => {
    if (!pr) return;
    try {
      await purchaseRequestsApi.removeQuotationAttachment(pr._id, attachmentId);
      await refetch();
      toast({ title: 'Quotation evidence removed', variant: 'success' });
    } catch (error) {
      toast({ title: 'Failed to remove', description: getErrorMessage(error, 'The file could not be removed right now.'), variant: 'error' });
    }
  };

  const handlePreviewAttachment = async (attachmentId: string, mimeType: string, name: string) => {
    if (!pr) return;
    setPreviewDialog({ open: true, url: null, mimeType, name, loading: true });
    try {
      const response = await apiClient.get(`/purchase-requests/${pr._id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUploadQuotationEvidence(e.dataTransfer.files?.[0] ?? null);
  };

  // Derive submit confirmation data
  const selectedEntry = canvass.canvassEntries.find((e) => e.isSelected);
  const selectedSupplier = selectedEntry
    ? (canvass.suppliers as Array<{ _id: string; companyName: string }>).find((s) => s._id === selectedEntry.supplierId)
    : null;
  const selectedTotal = selectedEntry
    ? procItems.reduce((sum, item) => sum + (Number(selectedEntry.quotedPrices[item._id]) || 0) * item.quantity, 0)
    : 0;

  const suppliersWithIds = canvass.canvassEntries.filter((e) => e.supplierId);
  const allPricesFilled = canvass.actionStep === 'quotation' && canvass.canvassEntries.every((entry) =>
    procItems.every((item) => {
      const price = Number(entry.quotedPrices[item._id]);
      return Number.isFinite(price) && price > 0;
    }),
  );
  const hasWinner = canvass.canvassEntries.some((e) => e.isSelected && e.supplierId);
  const hasEvidence = quotationAttachments.length > 0;
  const isReady = canvass.actionStep === 'quotation' && suppliersWithIds.length >= 1 && allPricesFilled && hasWinner;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <button
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors duration-150"
          onClick={() => navigate('/procurement')}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Procurement Queue
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 mb-4">
            <ShoppingCart className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">Purchase request not found</h3>
          <p className="text-[13px] text-zinc-500 max-w-sm">This request may have been removed or you may not have access.</p>
        </div>
      </div>
    );
  }

  const existingEntries = pr.canvassEntries ?? [];
  const readOnlyMode = existingEntries.length > 0 && canvass.actionStep !== 'quotation';

  const highestTotal = canvass.canvassEntries.length > 0
    ? Math.max(...canvass.canvassEntries.map((e) => procItems.reduce((s, i) => s + (Number(e.quotedPrices[i._id]) || 0) * i.quantity, 0)))
    : 0;
  const savings = selectedTotal > 0 && highestTotal > 0 ? highestTotal - selectedTotal : 0;

  const roSelectedEntry = existingEntries.find((e) => e.isSelected);
  const roSelectedTotal = roSelectedEntry?.totalQuotedAmount ?? 0;
  const roLowestTotal = existingEntries.length > 0 ? Math.min(...existingEntries.map((e) => e.totalQuotedAmount)) : 0;
  const roHighestTotal = existingEntries.length > 0 ? Math.max(...existingEntries.map((e) => e.totalQuotedAmount)) : 0;
  const roSavings = roSelectedTotal > 0 && roHighestTotal > 0 ? roHighestTotal - roSelectedTotal : 0;
  const roPriceDiffPercent = roSelectedTotal > 0 && roLowestTotal > 0 && roSelectedTotal !== roLowestTotal
    ? ((roSelectedTotal - roLowestTotal) / roLowestTotal * 100).toFixed(1)
    : null;

  const neededByDays = daysUntil(pr.neededByDate);
  const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : '—';

  return (
    <div className="space-y-0 pb-28 max-w-screen-2xl">

      {/* ── Page Header ───────────────────────────────────────── */}
      <div
        className="pr-detail-section sticky top-16 z-20 -mx-4 bg-white/95 backdrop-blur-sm border-b border-zinc-100 px-6 py-4 mb-6"
        style={{ animationDelay: '0s' }}
      >
        <button
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors duration-150 mb-3 tracking-wide uppercase"
          onClick={() => navigate('/procurement')}
        >
          <ArrowLeft className="h-3 w-3" /> Procurement Queue
        </button>

        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-tight text-zinc-900 truncate max-w-[640px]">
              {pr.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {pr.prNumber && (
                <span className="font-mono text-[12px] font-semibold text-zinc-400 tracking-tight">{pr.prNumber}</span>
              )}
              <span className="h-3.5 w-px bg-zinc-200" />
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                pr.status === 'pending_quotation' || pr.status === 'returned_for_info'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}>
                {PR_STATUS_LABELS[pr.status as PrStatusType]}
              </span>
              {(pr.priority === 'urgent' || pr.priority === 'high') && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  pr.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
                </span>
              )}
              {pr.neededByDate && (
                <>
                  <span className="h-3.5 w-px bg-zinc-200" />
                  <span className={`text-[12px] font-medium ${neededByDays !== null && neededByDays <= 3 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {neededByDays !== null && neededByDays <= 0
                      ? <span className="text-red-500">Overdue</span>
                      : <>Needed {formatDate(pr.neededByDate)} {neededByDays !== null && neededByDays > 0 && <span className="text-zinc-400 font-normal">({neededByDays}d left)</span>}</>}
                  </span>
                </>
              )}
              <span className="h-3.5 w-px bg-zinc-200" />
              <span className="text-[12px] text-zinc-400">{procItems.length} item{procItems.length !== 1 ? 's' : ''} to source</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {canvass.actionStep === null && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-[12px] h-9 gap-1.5"
                  onClick={() => { canvass.setReturnNote(''); canvass.setActionStep('return'); }}
                  disabled={canvass.isReturning || canvass.isSubmitting}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Request Clarification
                </Button>
                <Button
                  size="sm"
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] h-9 gap-1.5"
                  onClick={() => canvass.startQuotation(pr)}
                  disabled={procItems.length === 0 || canvass.isSubmitting || canvass.isReturning}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {existingEntries.length > 0 ? 'Continue Canvass' : 'Add Supplier Quotes'}
                </Button>
              </>
            )}
            {canvass.actionStep === 'return' && (
              <Button size="sm" variant="outline" className="text-[12px] h-9" onClick={() => canvass.setActionStep(null)} disabled={canvass.isReturning}>
                Cancel
              </Button>
            )}
            {canvass.actionStep === 'quotation' && (
              <Button size="sm" variant="outline" className="text-[12px] h-9" onClick={() => setShowDiscardConfirm(true)} disabled={canvass.isSubmitting}>
                Discard Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Main ─────────────────────────────── */}
      <div className="pr-detail-section grid gap-6 lg:grid-cols-[280px_1fr] items-start" style={{ animationDelay: '0.06s' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">

          {/* Requester */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-400 mb-3">Requester</p>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 font-semibold text-[12px] text-zinc-600">
                {requester?.firstName?.[0] ?? <User className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight text-zinc-900">{requesterName}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{department?.name ?? '—'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Submitted</span>
                <span className="text-[12px] font-medium text-zinc-700">{formatDate(pr.submittedAt) || '—'}</span>
              </div>
              {pr.projectId && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-zinc-400 shrink-0">Project</span>
                  <span className="text-[12px] font-medium text-zinc-700 text-right truncate">
                    {(pr.projectId as unknown as { name: string }).name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-zinc-100" />

          {/* Purpose */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-400 mb-2">Purpose</p>
            <p className="text-[12.5px] leading-relaxed text-zinc-600">{pr.justification}</p>
          </div>

          <div className="h-px bg-zinc-100" />

          {/* Items to Source */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Items to Source</p>
              <span className="ml-auto text-[11px] font-semibold text-zinc-400 tabular-nums">{procItems.length}</span>
            </div>
            {procItems.length === 0 ? (
              <p className="text-[12px] text-zinc-400">All items are online-sourced.</p>
            ) : (
              <div className="space-y-0.5">
                {procItems.map((item, i) => (
                  <div key={item._id} className="rounded-lg px-3 py-3 hover:bg-zinc-50/80 transition-colors duration-150">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-500 tabular-nums">{i + 1}</span>
                          <p className="text-[12.5px] font-semibold leading-snug text-zinc-800">{item.description}</p>
                        </div>
                        <div className="ml-7 mt-1.5 space-y-1">
                          <p className="text-[11px] font-medium text-zinc-500">{item.quantity} {item.unit}</p>
                          {item.specifications && (
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{item.specifications}</p>
                          )}
                          {item.notes && (
                            <p className="text-[11px] text-zinc-400 italic">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      {item.referencePhotoPath && (
                        <button
                          type="button"
                          onClick={() => handleViewItemPhoto(item._id)}
                          className="shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100 transition-colors duration-150"
                        >
                          <Camera className="h-2.5 w-2.5" /> Photo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Main Workspace ─────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Read-Only Supplier Comparison */}
          {readOnlyMode && (
            <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-start justify-between px-6 pt-5 pb-4 gap-4 border-b border-zinc-100">
                <div>
                  <h2 className="text-[16px] font-bold tracking-[-0.01em] text-zinc-900">Supplier Comparison</h2>
                  <p className="text-[12px] mt-1">
                    {existingEntries.length === 1 ? (
                      <span className="text-blue-600 font-medium">1 Supplier Submitted</span>
                    ) : roSelectedEntry ? (
                      <span className="text-emerald-600 font-medium">{existingEntries.length} Suppliers Compared · Ready for Review</span>
                    ) : (
                      <span className="text-amber-600 font-medium">{existingEntries.length} Suppliers · Selection Required</span>
                    )}
                  </p>
                </div>
                {roSelectedTotal > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Selected Total</p>
                    <p className="text-[26px] font-bold tabular-nums leading-tight text-zinc-900 mt-0.5">{formatCurrency(roSelectedTotal)}</p>
                    {roSavings > 0 && (
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                        <TrendingDown className="h-3 w-3" /> saves {formatCurrency(roSavings)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {existingEntries.length > 0 && (existingEntries.length === 1 || roPriceDiffPercent || (roSelectedEntry && existingEntries.length > 1 && roSelectedTotal === roLowestTotal)) && (
                <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-zinc-100">
                  {existingEntries.length === 1 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-[11px] text-blue-700 font-medium">
                      <Info className="h-3 w-3" /> Single supplier — justification required
                    </span>
                  )}
                  {roPriceDiffPercent && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-[11px] text-amber-700 font-medium">
                      <AlertTriangle className="h-3 w-3" /> Selected is +{roPriceDiffPercent}% above cheapest
                    </span>
                  )}
                  {roSelectedEntry && existingEntries.length > 1 && roSelectedTotal === roLowestTotal && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="h-3 w-3" /> Lowest qualified bid selected
                    </span>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-zinc-50/60">
                      <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Supplier</th>
                      {existingEntries[0]?.quotedItems.map((qi) => (
                        <th key={qi.itemId} className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-zinc-400 max-w-[180px]">
                          <span className="block truncate">{qi.description}</span>
                        </th>
                      ))}
                      <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingEntries.map((entry) => {
                      const isWinner = entry.isSelected;
                      const isOnlySupplier = existingEntries.length === 1;
                      const isLowestBid = existingEntries.length > 1 && entry.totalQuotedAmount === roLowestTotal;
                      return (
                        <tr
                          key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                          className={`border-t border-zinc-100 transition-colors duration-150 hover:bg-zinc-50/40 ${
                            isWinner ? 'bg-emerald-50/40 shadow-[inset_3px_0_0_theme(colors.emerald.400)]' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isWinner && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                              <span className={`font-semibold ${isWinner ? 'text-zinc-900' : 'text-zinc-700'}`}>{entry.supplierName}</span>
                              {isWinner && !isOnlySupplier && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <Trophy className="h-2.5 w-2.5" /> Winner
                                </span>
                              )}
                              {isOnlySupplier && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                  Only Supplier
                                </span>
                              )}
                              {isLowestBid && !isWinner && (
                                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                                  Lowest Bid
                                </span>
                              )}
                            </div>
                            {entry.remarks && <p className="text-[11px] text-zinc-400 mt-1 italic">{entry.remarks}</p>}
                          </td>
                          {entry.quotedItems.map((qi) => (
                            <td key={qi.itemId} className={`text-right px-6 py-4 tabular-nums ${isWinner ? 'text-zinc-700' : 'text-zinc-500'}`}>
                              {formatCurrency(qi.unitPrice)}
                            </td>
                          ))}
                          <td className={`text-right px-6 py-4 tabular-nums font-bold text-[14px] ${isWinner ? 'text-emerald-700' : 'text-zinc-700'}`}>
                            {formatCurrency(entry.totalQuotedAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {existingEntries.length < 3 && pr.canvassJustification && (
                <div className="mx-6 mb-5 mt-3 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-amber-600 mb-1.5">Fewer than 3 suppliers — justification</p>
                  <p className="text-[12.5px] text-amber-900 leading-relaxed">{pr.canvassJustification}</p>
                </div>
              )}
            </div>
          )}

          {/* Active Canvass Matrix */}
          {canvass.actionStep === 'quotation' && (
            <CanvassMatrix
              procItems={procItems}
              entries={canvass.canvassEntries}
              suppliers={canvass.suppliers as Array<{ _id: string; companyName: string }>}
              canvassJustification={canvass.canvassJustification}
              onJustificationChange={canvass.setCanvassJustification}
              onAddEntry={canvass.addEntry}
              onRemoveEntry={canvass.removeEntry}
              onUpdateEntry={canvass.updateEntry}
              onSetWinner={canvass.setWinner}
            />
          )}

          {/* Clarification composer — only visible while procurement is asking */}
          {canvass.actionStep === 'return' && (
            <div className="rounded-xl border border-amber-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-zinc-100">
                <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" />
                <h3 className="text-[14px] font-semibold text-zinc-900">Ask for clarification</h3>
              </div>
              <div className="px-6 pt-4 pb-5">
                <p className="text-[11px] text-zinc-400 mb-3">The requester will be notified and the PR returns to them for a reply.</p>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 focus:bg-white resize-none transition-all duration-150 leading-relaxed"
                  placeholder="e.g. Please specify the exact model number or acceptable brand equivalents…"
                  value={canvass.returnNote}
                  onChange={(e) => canvass.setReturnNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canvass.returnNote.trim()) canvass.handleReturnForInfo(); }}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] text-zinc-400">Cmd/Ctrl + Enter to send</p>
                  <Button
                    size="sm"
                    className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] gap-1.5"
                    onClick={canvass.handleReturnForInfo}
                    disabled={canvass.isReturning || !canvass.returnNote.trim()}
                  >
                    {canvass.isReturning
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5" />}
                    Send to Requester
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quotation Evidence */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Quotation Evidence</h2>
                {quotationAttachments.length === 0 && (
                  <p className="text-[12px] text-zinc-400 mt-0.5">At least one file required before submitting</p>
                )}
              </div>
              <label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => { handleUploadQuotationEvidence(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  disabled={isUploadingQuoteFile || canvass.isSubmitting}
                />
                <Button type="button" variant="outline" size="sm" className="cursor-pointer text-[12px] h-8 gap-1.5" asChild>
                  <span>
                    {isUploadingQuoteFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload File
                  </span>
                </Button>
              </label>
            </div>

            <div className="px-6 pb-6 pt-4">
              {quotationAttachments.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center transition-all duration-200 cursor-pointer ${
                    isDragging ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                    <Paperclip className="h-4.5 w-4.5 text-zinc-400" />
                  </div>
                  <p className="text-[13px] font-medium text-zinc-600">Drop files here or click to upload</p>
                  <p className="text-[11px] text-zinc-400 mt-1">PDF, XLSX, PNG, JPG accepted</p>
                </div>
              ) : (
                <div
                  className={`space-y-2 transition-all duration-200 ${isDragging ? 'ring-2 ring-zinc-300 ring-offset-2 rounded-xl' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {quotationAttachments.map((att) => (
                    <div
                      key={att._id}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 hover:bg-zinc-50 transition-colors duration-150 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {fileTypeIcon(att.mimeType)}
                        <div className="min-w-0">
                          <span className="block text-[13px] font-medium text-zinc-800 truncate">{att.originalName}</span>
                          {att.uploadedAt && (
                            <span className="block text-[10px] text-zinc-400 mt-0.5">{formatDate(att.uploadedAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {canPreviewAttachment(att.mimeType) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" title="Preview"
                            onClick={() => handlePreviewAttachment(att._id, att.mimeType, att.originalName)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" title="Download"
                          onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" title="Remove"
                          onClick={() => handleRemoveQuotationEvidence(att._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {isDragging && (
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-4">
                      <p className="text-[12px] text-zinc-500 font-medium">Drop file to upload</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Sticky Footer: Quotation Mode ─────────────────── */}
      {canvass.actionStep === 'quotation' && (
        <StickyFooter className="border-t border-zinc-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <ChecklistItem done={suppliersWithIds.length >= 1} label={`${suppliersWithIds.length} supplier${suppliersWithIds.length !== 1 ? 's' : ''}`} />
              <div className="h-3.5 w-px bg-zinc-200 hidden sm:block" />
              <ChecklistItem done={allPricesFilled} label="All prices filled" />
              <div className="h-3.5 w-px bg-zinc-200 hidden sm:block" />
              <ChecklistItem done={hasWinner} label="Winner selected" />
              <div className="h-3.5 w-px bg-zinc-200 hidden sm:block" />
              <ChecklistItem done={hasEvidence} label={`${quotationAttachments.length > 0 ? quotationAttachments.length + ' evidence file' + (quotationAttachments.length !== 1 ? 's' : '') : 'Evidence (optional)'}`} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!isReady && (
                <p className="text-[11px] text-amber-600 hidden lg:block max-w-[200px] leading-tight font-medium text-right">
                  {!hasWinner ? 'Select a winning supplier' :
                   !allPricesFilled ? 'Complete all prices' :
                   suppliersWithIds.length < 1 ? 'Add at least one supplier' : ''}
                </p>
              )}
              {isReady && (
                <p className="text-[11px] text-zinc-400 hidden lg:block max-w-[200px] leading-tight text-right">
                  Sends pricing to COO for review
                </p>
              )}
              <Button
                variant="outline"
                className="text-[12px] h-9 gap-1.5"
                onClick={() => canvass.handleSaveDraft()}
                disabled={canvass.isSubmitting || canvass.isSavingDraft || suppliersWithIds.length === 0}
              >
                {canvass.isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </Button>
              <Button
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] h-9 gap-1.5"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={canvass.isSubmitting || canvass.isSavingDraft || !isReady}
              >
                {canvass.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit Supplier Decision
              </Button>
            </div>
          </div>
        </StickyFooter>
      )}

      {/* ── Discard Confirmation ────────────────────────────── */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Discard Changes?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            All supplier entries, prices, and notes you entered will be lost.
          </p>
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => setShowDiscardConfirm(false)}>Keep Editing</Button>
            <Button variant="destructive" className="text-[12px]" onClick={() => { setShowDiscardConfirm(false); canvass.resetActions(); }}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Confirmation ─────────────────────────────── */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Confirm Supplier Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span className="text-[14px] font-semibold text-zinc-900">
                  {selectedSupplier?.companyName ?? 'No supplier selected'}
                </span>
              </div>
              <div className="text-[26px] font-bold text-zinc-900 tabular-nums leading-tight">{formatCurrency(selectedTotal)}</div>
              <div className="flex items-center gap-3 text-[12px] text-zinc-400">
                <span>{canvass.canvassEntries.length} supplier{canvass.canvassEntries.length !== 1 ? 's' : ''} compared</span>
                <span className="text-zinc-200">·</span>
                <span>{quotationAttachments.length} evidence file{quotationAttachments.length !== 1 ? 's' : ''}</span>
              </div>
              {savings > 0 && (
                <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                  <TrendingDown className="h-3.5 w-3.5" /> {formatCurrency(savings)} savings vs next best quote
                </div>
              )}
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              This will send the purchase request to the COO for price review. Make sure all prices and evidence are correct before proceeding.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => setShowSubmitConfirm(false)}>Go Back</Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] gap-1.5"
              onClick={() => { setShowSubmitConfirm(false); canvass.handleSubmitQuotation(); }}
              disabled={canvass.isSubmitting}
            >
              {canvass.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Attachment Preview ────────────────────────────────── */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => { if (!o) closePreviewDialog(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[14px]">
              <FileText className="h-4 w-4 text-zinc-400" /> {previewDialog.name || 'Attachment Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {previewDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            ) : previewDialog.url && previewDialog.mimeType === 'application/pdf' ? (
              <iframe src={previewDialog.url} title={previewDialog.name} className="h-[70vh] w-full rounded-xl border border-zinc-200" />
            ) : previewDialog.url ? (
              <img src={previewDialog.url} alt={previewDialog.name} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Item Photo ─────────────────────────────────────────── */}
      <Dialog open={itemPhotoDialog.open} onOpenChange={(o) => { if (!o) closeItemPhotoDialog(); }}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[14px]">
              <ImageIcon className="h-4 w-4 text-zinc-400" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {itemPhotoDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            ) : itemPhotoDialog.url ? (
              <img src={itemPhotoDialog.url} alt="Reference photo" className="max-h-[60vh] max-w-full rounded-xl object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Checklist Item ──────────────────────────────────────── */

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      {done
        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        : <XCircle className="h-3.5 w-3.5 text-zinc-300 shrink-0" />}
      <span className={done ? 'text-zinc-700 font-medium' : 'text-zinc-400'}>{label}</span>
    </div>
  );
}
