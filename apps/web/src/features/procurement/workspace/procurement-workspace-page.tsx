import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Eye, CheckCircle2, RotateCcw,
  Loader2, User,
  Paperclip, Download, Camera, ImageIcon, FileText, Upload, Trash2,
  Trophy, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, TrendingDown, Clock, Info,
  FileSpreadsheet, FileImage,
} from 'lucide-react';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { AttachmentCategory, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequest } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { QuotationReturn } from '@prams/shared';
import { formatCurrency, formatDate, formatDateTime, canPreviewAttachment, getErrorMessage } from './utils';
import { useCanvass } from './use-canvass';
import { CanvassMatrix } from './canvass-matrix';

/* ── Helpers ─────────────────────────────────────────────── */

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fileTypeIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('.sheet'))
    return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
  return <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-400" />;
}

/* ── Collapsible Rail Section ────────────────────────────── */

function RailSection({ title, defaultOpen = true, children, badge }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-4 py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between group"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">{title}</p>
          {badge}
        </div>
        {open
          ? <ChevronUp className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500 transition-colors duration-150" />
          : <ChevronDown className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500 transition-colors duration-150" />}
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'mt-3 max-h-[800px] opacity-100' : 'max-h-0 opacity-0 mt-0'}`}>
        {children}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */

export function ProcurementWorkspacePage() {
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
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);

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

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleUploadQuotationEvidence(file);
  };

  // Derive submit confirmation data
  const selectedEntry = canvass.canvassEntries.find((e) => e.isSelected);
  const selectedSupplier = selectedEntry
    ? (canvass.suppliers as Array<{ _id: string; companyName: string }>).find((s) => s._id === selectedEntry.supplierId)
    : null;
  const selectedTotal = selectedEntry
    ? procItems.reduce((sum, item) => {
        const price = Number(selectedEntry.quotedPrices[item._id]) || 0;
        return sum + price * item.quantity;
      }, 0)
    : 0;

  // Readiness checks (when in quotation mode)
  const suppliersWithIds = canvass.canvassEntries.filter((e) => e.supplierId);
  const allPricesFilled = canvass.actionStep === 'quotation' && canvass.canvassEntries.every((entry) =>
    procItems.every((item) => {
      const price = Number(entry.quotedPrices[item._id]);
      return Number.isFinite(price) && price > 0;
    }),
  );
  const hasWinner = canvass.canvassEntries.some((e) => e.isSelected && e.supplierId);
  const hasEvidence = quotationAttachments.length > 0;
  const isReady = canvass.actionStep === 'quotation'
    && suppliersWithIds.length >= 1
    && allPricesFilled
    && hasWinner
    && hasEvidence;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <div className="pr-detail-section" style={{ animationDelay: '0s' }}>
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="pr-detail-section grid gap-8 lg:grid-cols-[300px_1fr]" style={{ animationDelay: '0.06s' }}>
          <Skeleton className="h-96 rounded-xl" /><Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <button
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition-colors duration-150"
          onClick={() => navigate('/procurement')}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Procurement Queue
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 mb-5">
            <ShoppingCart className="h-7 w-7 text-zinc-400" />
          </div>
          <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">Purchase request not found</h3>
          <p className="text-[13px] text-zinc-500 max-w-sm">
            This request may have been removed or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  const hasReturnHistory = pr.quotationReturnHistory && pr.quotationReturnHistory.length > 0;

  // Comparison intelligence
  const existingEntries = pr.canvassEntries ?? [];
  const readOnlyMode = existingEntries.length > 0 && canvass.actionStep !== 'quotation';
  const highestTotal = canvass.canvassEntries.length > 0
    ? Math.max(...canvass.canvassEntries.map((e) => procItems.reduce((s, i) => s + (Number(e.quotedPrices[i._id]) || 0) * i.quantity, 0)))
    : 0;
  const savings = selectedTotal > 0 && highestTotal > 0 ? highestTotal - selectedTotal : 0;

  // Read-only comparison intelligence
  const roSelectedEntry = existingEntries.find((e) => e.isSelected);
  const roSelectedTotal = roSelectedEntry?.totalQuotedAmount ?? 0;
  const roLowestTotal = existingEntries.length > 0
    ? Math.min(...existingEntries.map((e) => e.totalQuotedAmount))
    : 0;
  const roHighestTotal = existingEntries.length > 0
    ? Math.max(...existingEntries.map((e) => e.totalQuotedAmount))
    : 0;
  const roSavings = roSelectedTotal > 0 && roHighestTotal > 0 ? roHighestTotal - roSelectedTotal : 0;
  const roPriceDiffPercent = roSelectedTotal > 0 && roLowestTotal > 0 && roSelectedTotal !== roLowestTotal
    ? ((roSelectedTotal - roLowestTotal) / roLowestTotal * 100).toFixed(1)
    : null;

  const neededByDays = daysUntil(pr.neededByDate);

  return (
    <div className="space-y-0 pb-24 max-w-screen-2xl">
      {/* ── Workspace Header ───────────────────────────────── */}
      <div
        className="pr-detail-section sticky top-0 z-20 -mx-4 bg-white/95 backdrop-blur-sm px-4 py-4 border-b border-zinc-100 mb-6"
        style={{ animationDelay: '0s' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <button
              className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors duration-150 mb-2"
              onClick={() => navigate('/procurement')}
            >
              <ArrowLeft className="h-3 w-3" /> Procurement Queue
            </button>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] leading-tight text-zinc-900 truncate max-w-[600px]">
              {pr.title}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {pr.prNumber && (
                <span className="font-mono text-[12px] font-medium text-zinc-600 tracking-tight">{pr.prNumber}</span>
              )}
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                Approved
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                pr.status === 'pending_quotation' || pr.status === 'returned_for_info'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}>
                {PR_STATUS_LABELS[pr.status as PrStatusType]}
              </span>
              {(pr.priority === 'urgent' || pr.priority === 'high') && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  pr.priority === 'urgent' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
                </span>
              )}
              {pr.neededByDate && (
                <>
                  <span className="text-zinc-300">·</span>
                  <span className={`text-[12px] ${neededByDays !== null && neededByDays <= 3 ? 'text-red-600 font-medium' : 'text-zinc-500'}`}>
                    Need by <span className="font-medium">{formatDate(pr.neededByDate)}</span>
                    {neededByDays !== null && neededByDays > 0 && (
                      <span className="text-zinc-400 ml-1">({neededByDays}d left)</span>
                    )}
                    {neededByDays !== null && neededByDays <= 0 && (
                      <span className="text-red-500 ml-1">(overdue)</span>
                    )}
                  </span>
                </>
              )}
              <span className="text-zinc-300">·</span>
              <span className="text-[12px] text-zinc-500">{procItems.length} item{procItems.length !== 1 ? 's' : ''} to source</span>
            </div>
          </div>
          {/* Mode-switching CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {canvass.actionStep === null && <>
              <Button size="sm" variant="outline"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 text-[12px] h-8"
                onClick={() => { canvass.setReturnNote(''); canvass.setActionStep('return'); }}
                disabled={canvass.isReturning || canvass.isSubmitting}>
                <RotateCcw className="h-3.5 w-3.5" /> Request Clarification
              </Button>
              <Button size="sm"
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] h-8"
                onClick={() => canvass.startQuotation(pr)}
                disabled={procItems.length === 0 || canvass.isSubmitting || canvass.isReturning}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {existingEntries.length > 0 ? 'Continue Canvass' : 'Add Supplier Quotes'}
              </Button>
            </>}
            {canvass.actionStep === 'return' && (
              <Button size="sm" variant="outline" className="text-[12px] h-8" onClick={() => canvass.setActionStep(null)} disabled={canvass.isReturning}>
                Cancel
              </Button>
            )}
            {canvass.actionStep === 'quotation' && (
              <Button size="sm" variant="outline" className="text-[12px] h-8" onClick={() => setShowDiscardConfirm(true)} disabled={canvass.isSubmitting}>
                Discard
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-Column Workspace ─────────────────────────────── */}
      <div className="pr-detail-section grid gap-8 lg:grid-cols-[300px_1fr] items-start" style={{ animationDelay: '0.06s' }}>

        {/* LEFT: Context Rail (sticky, collapsible) */}
        <div className="lg:sticky lg:top-[100px] lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto space-y-0 pb-4 rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">

          {/* Requester */}
          <RailSection title="Requester">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 font-semibold text-[13px] text-zinc-500">
                {requester?.firstName?.[0] ?? <User className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight text-zinc-800">{requester ? `${requester.firstName} ${requester.lastName}` : '\u2014'}</p>
                <p className="text-[11px] text-zinc-400">{department?.name ?? '\u2014'}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-zinc-400">Submitted</span>
                <span className="font-medium text-zinc-700">{formatDate(pr.submittedAt) || '\u2014'}</span>
              </div>
              {pr.neededByDate && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-zinc-400">Needed by</span>
                  <span className={`font-medium ${neededByDays !== null && neededByDays <= 3 ? 'text-red-600' : 'text-zinc-700'}`}>{formatDate(pr.neededByDate)}</span>
                </div>
              )}
              {pr.projectId && (
                <div className="flex justify-between gap-2 text-[12px]">
                  <span className="text-zinc-400 shrink-0">Project</span>
                  <span className="font-medium text-zinc-700 text-right truncate">{(pr.projectId as unknown as { name: string }).name}</span>
                </div>
              )}
            </div>
          </RailSection>

          <Separator />

          {/* Purpose */}
          <RailSection title="Purpose">
            <p className="text-[13px] leading-relaxed text-zinc-600">{pr.justification}</p>
          </RailSection>

          <Separator />

          {/* Items to Source */}
          <RailSection
            title="Items to Source"
            badge={<span className="text-[10px] font-medium text-zinc-400 tabular-nums">{procItems.length}</span>}
          >
            {procItems.length === 0 ? (
              <p className="text-[12px] text-zinc-400">All items are online-sourced.</p>
            ) : (
              <div className="space-y-2.5">
                {procItems.map((item, i) => (
                  <div key={item._id}>
                    {i > 0 && <Separator className="mb-2.5" />}
                    <div className="space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium leading-snug text-zinc-800">{item.description}</p>
                        {item.referencePhotoPath && (
                          <button type="button" onClick={() => handleViewItemPhoto(item._id)}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-100 transition-colors duration-150">
                            <Camera className="h-2.5 w-2.5" /> Photo
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">{item.quantity} {item.unit}</p>
                      {item.specifications && <p className="text-[11px] text-zinc-400/70 italic leading-relaxed">{item.specifications}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RailSection>

          {/* Clarification History */}
          {hasReturnHistory && (
            <>
              <Separator />
              <RailSection
                title="Clarification History"
                badge={<span className="text-[10px] font-medium text-amber-600 tabular-nums">{pr.quotationReturnHistory!.length}</span>}
              >
                <div className="space-y-3">
                  {[...pr.quotationReturnHistory!].reverse().map((entry: QuotationReturn) => {
                    const returnedBy = typeof entry.returnedBy === 'object' && entry.returnedBy
                      ? `${entry.returnedBy.firstName} ${entry.returnedBy.lastName}` : 'Procurement';
                    return (
                      <div key={entry._id} className="space-y-1">
                        <p className="text-[11px] text-zinc-400">{returnedBy} · {formatDateTime(entry.returnedAt)}</p>
                        <div className="rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-2">
                          <p className="text-[12px] text-amber-800 italic leading-relaxed">"{entry.note}"</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RailSection>
            </>
          )}
        </div>

        {/* RIGHT: Main Workspace */}
        <div className="space-y-6 min-w-0">

          {/* ── Read-Only Supplier Comparison (Hero) ────────── */}
          {readOnlyMode && (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4">
                <div>
                  <h2 className="text-[16px] font-bold text-zinc-900">Supplier Comparison</h2>
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
                    <p className="text-[11px] text-zinc-400 uppercase tracking-[0.06em] font-semibold">Selected Total</p>
                    <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-tight mt-0.5">{formatCurrency(roSelectedTotal)}</p>
                    {roSavings > 0 && (
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                        <TrendingDown className="h-3 w-3" /> saves {formatCurrency(roSavings)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Comparison Intelligence */}
              {existingEntries.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {existingEntries.length === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1 text-[11px] text-blue-700 font-medium">
                      <Info className="h-3 w-3" /> Single supplier — justification required
                    </span>
                  )}
                  {roPriceDiffPercent && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1 text-[11px] text-amber-700 font-medium">
                      <AlertTriangle className="h-3 w-3" /> Selected is +{roPriceDiffPercent}% above cheapest
                    </span>
                  )}
                  {roSelectedEntry && existingEntries.length > 1 && roSelectedTotal === roLowestTotal && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="h-3 w-3" /> Lowest qualified bid selected
                    </span>
                  )}
                  {neededByDays !== null && neededByDays > 0 && neededByDays <= 14 && (
                    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium border ${
                      neededByDays <= 3 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                    }`}>
                      <Clock className="h-3 w-3" /> Needed in {neededByDays} day{neededByDays !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-t border-b border-zinc-100 bg-zinc-50/60">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Supplier</th>
                      {existingEntries[0]?.quotedItems.map((qi) => (
                        <th key={qi.itemId} className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 max-w-[200px]">
                          <span className="block truncate">{qi.description}</span>
                        </th>
                      ))}
                      <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</th>
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
                          className={`border-b border-zinc-100/60 last:border-0 transition-all duration-150 hover:bg-zinc-50/60 ${
                            isWinner
                              ? 'bg-emerald-50/60 shadow-[inset_3px_0_0_theme(colors.emerald.500)]'
                              : ''
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {isWinner && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                              <span className={`font-semibold ${isWinner ? 'text-zinc-900' : 'text-zinc-700'}`}>{entry.supplierName}</span>
                              {isWinner && !isOnlySupplier && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                  <Trophy className="h-2.5 w-2.5" /> Winner
                                </span>
                              )}
                              {isOnlySupplier && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100">
                                  Only Supplier
                                </span>
                              )}
                              {isLowestBid && !isWinner && (
                                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                                  Lowest Bid
                                </span>
                              )}
                            </div>
                            {entry.remarks && <p className="text-[11px] text-zinc-400 mt-0.5 italic">{entry.remarks}</p>}
                          </td>
                          {entry.quotedItems.map((qi) => (
                            <td key={qi.itemId} className={`text-right px-5 py-3.5 tabular-nums ${isWinner ? 'text-zinc-700' : 'text-zinc-500'}`}>{formatCurrency(qi.unitPrice)}</td>
                          ))}
                          <td className={`text-right px-5 py-3.5 tabular-nums font-bold text-[14px] ${isWinner ? 'text-emerald-700' : 'text-zinc-800'}`}>
                            {formatCurrency(entry.totalQuotedAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {existingEntries.length < 3 && pr.canvassJustification && (
                <div className="mx-5 mb-5 mt-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700 mb-1">Fewer than 3 suppliers — justification</p>
                  <p className="text-[13px] text-amber-900 leading-relaxed">{pr.canvassJustification}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Active Canvass Matrix ─────────────────────── */}
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

          {/* ── Request Clarification Panel ───────────────── */}
          {canvass.actionStep === 'return' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <p className="text-[14px] font-semibold text-amber-900">Request Clarification from Requester</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="return-note" className="text-[12px] text-amber-800">
                  Message to Requester <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="return-note"
                  rows={4}
                  className="flex w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-[13px] shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 resize-none transition-shadow duration-150"
                  placeholder="e.g. Please specify the exact model number, wattage, and whether brand equivalents are acceptable..."
                  value={canvass.returnNote}
                  onChange={(e) => canvass.setReturnNote(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ── Quotation Evidence ────────────────────────── */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Quotation Evidence</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">Upload supplier quote documents — PDF, XLSX, PNG, JPG</p>
              </div>
              <label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden"
                  onChange={(e) => { handleUploadQuotationEvidence(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  disabled={isUploadingQuoteFile || canvass.isSubmitting} />
                <Button type="button" variant="outline" size="sm" className="cursor-pointer text-[12px] h-8" asChild>
                  <span>{isUploadingQuoteFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload</span>
                </Button>
              </label>
            </div>
            <div className="px-5 pb-5">
              {quotationAttachments.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center transition-all duration-200 ${
                    isDragging ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Paperclip className="h-7 w-7 text-zinc-300 mb-2" />
                  <p className="text-[13px] font-medium text-zinc-500">No evidence uploaded yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Drag and drop files here, or click Upload above</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">At least one file required before submitting</p>
                </div>
              ) : (
                <div
                  className={`space-y-1.5 rounded-xl transition-all duration-200 ${isDragging ? 'ring-2 ring-zinc-300 ring-offset-2' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {quotationAttachments.map((att) => (
                    <div key={att._id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2.5 hover:bg-zinc-50/60 transition-colors duration-150 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {fileTypeIcon(att.mimeType)}
                        <div className="min-w-0">
                          <span className="block text-[13px] font-medium text-zinc-700 truncate">{att.originalName}</span>
                          {att.uploadedAt && (
                            <span className="block text-[10px] text-zinc-400">{formatDate(att.uploadedAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150">
                        {canPreviewAttachment(att.mimeType) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-800" title="Preview" onClick={() => handlePreviewAttachment(att._id, att.mimeType, att.originalName)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-800" title="Download" onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" title="Remove" onClick={() => handleRemoveQuotationEvidence(att._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {isDragging && (
                    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 py-4">
                      <p className="text-[12px] text-zinc-500">Drop file to upload</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── All Line Items (collapsible) ────────────────── */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 group hover:bg-zinc-50/40 transition-colors duration-150"
              onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold text-zinc-900">All Line Items ({pr.items.length})</h2>
                <span className="text-[12px] tabular-nums font-semibold text-zinc-500">
                  {procItems.some((i) => !i.quotedUnitPrice)
                    ? 'Awaiting Quotations'
                    : formatCurrency(pr.totalAmount)}
                </span>
              </div>
              {lineItemsExpanded
                ? <ChevronUp className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-150" />
                : <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-150" />}
            </button>
            {lineItemsExpanded && <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-t border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 w-8">#</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Item</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 w-24">Sourcing</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Qty</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Unit Price</th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</th>
                    <th className="w-8 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pr.items.map((item, i) => {
                    const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                    const displayPrice = isProcurement ? (item.quotedUnitPrice ?? 0) : (item.estimatedPrice ?? 0);
                    const isPending = isProcurement && !item.quotedUnitPrice;
                    return (
                      <tr key={item._id} className="border-b border-zinc-100/60 last:border-0 hover:bg-zinc-50/60 transition-colors duration-150">
                        <td className="px-5 py-3 text-zinc-400">{i + 1}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-zinc-800 leading-snug">{item.description}</p>
                          {item.specifications && <p className="text-[11px] text-zinc-400 mt-0.5 italic line-clamp-1">{item.specifications}</p>}
                        </td>
                        <td className="px-5 py-3">
                          {isProcurement
                            ? <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100"><ShoppingCart className="h-2.5 w-2.5" /> Procurement</span>
                            : <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">Online</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-500 whitespace-nowrap tabular-nums">{item.quantity} {item.unit}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap tabular-nums">
                          {isPending ? <span className="text-amber-600 italic">Awaiting quotation</span> : <span className="text-zinc-600">{formatCurrency(displayPrice)}</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap tabular-nums text-zinc-800">
                          {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : '\u2014'}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {item.referencePhotoPath && (
                            <button type="button" onClick={() => handleViewItemPhoto(item._id)} title="View photo"
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-blue-500 hover:bg-blue-50 transition-colors duration-150">
                              <Camera className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
                    <td colSpan={5} className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</td>
                    <td className="px-5 py-3 text-right text-[16px] font-bold tabular-nums text-zinc-900">
                      {procItems.some((i) => !i.quotedUnitPrice)
                        ? <span className="text-amber-600 text-[13px]">Awaiting Quotations</span>
                        : formatCurrency(pr.totalAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>}
          </div>
        </div>
      </div>

      {/* ── Sticky Footer: Quotation Mode ────────────────── */}
      {canvass.actionStep === 'quotation' && (
        <StickyFooter className="border-t border-zinc-200 bg-white/90">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <ChecklistItem done={suppliersWithIds.length >= 1} label={`${suppliersWithIds.length} supplier${suppliersWithIds.length !== 1 ? 's' : ''}`} />
              <span className="text-zinc-200 hidden sm:inline">|</span>
              <ChecklistItem done={allPricesFilled} label="All prices" />
              <span className="text-zinc-200 hidden sm:inline">|</span>
              <ChecklistItem done={hasWinner} label="Winner selected" />
              <span className="text-zinc-200 hidden sm:inline">|</span>
              <ChecklistItem done={hasEvidence} label={`${quotationAttachments.length} evidence`} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!isReady && (
                <p className="text-[11px] text-amber-600 hidden lg:block max-w-[220px] leading-tight font-medium">
                  {!hasWinner ? 'Select a winning supplier' :
                   !allPricesFilled ? 'Complete all prices' :
                   !hasEvidence ? 'Upload quotation evidence' :
                   suppliersWithIds.length < 1 ? 'Add at least one supplier' : ''}
                </p>
              )}
              {isReady && (
                <p className="text-[11px] text-zinc-400 hidden lg:block max-w-[220px] leading-tight">
                  Sends final pricing to COO for review
                </p>
              )}
              <Button
                className="bg-zinc-900 hover:bg-zinc-800 text-white shrink-0 text-[12px] h-9"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={canvass.isSubmitting || !isReady}
              >
                {canvass.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit Supplier Decision
              </Button>
            </div>
          </div>
        </StickyFooter>
      )}

      {/* ── Sticky Footer: Return Mode ───────────────────── */}
      {canvass.actionStep === 'return' && (
        <StickyFooter className="border-t border-zinc-200 bg-white/90">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" className="text-[12px] h-9" onClick={() => canvass.setActionStep(null)} disabled={canvass.isReturning}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white text-[12px] h-9"
              onClick={canvass.handleReturnForInfo} disabled={canvass.isReturning || !canvass.returnNote.trim()}>
              {canvass.isReturning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Send Clarification
            </Button>
          </div>
        </StickyFooter>
      )}

      {/* ── Discard Confirmation ──────────────────────────── */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Discard Changes?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-zinc-500">
            All supplier entries, prices, and notes you entered will be lost.
          </p>
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => setShowDiscardConfirm(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              className="text-[12px]"
              onClick={() => { setShowDiscardConfirm(false); canvass.resetActions(); }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Confirmation ───────────────────────────── */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Confirm Supplier Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span className="text-[14px] font-semibold text-zinc-900">
                  {selectedSupplier?.companyName ?? 'No supplier selected'}
                </span>
              </div>
              <div className="text-[24px] font-bold text-zinc-900 tabular-nums">{formatCurrency(selectedTotal)}</div>
              <div className="flex items-center gap-3 text-[12px] text-zinc-500">
                <span>{canvass.canvassEntries.length} supplier{canvass.canvassEntries.length !== 1 ? 's' : ''} compared</span>
                <span className="text-zinc-300">·</span>
                <span>{quotationAttachments.length} evidence file{quotationAttachments.length !== 1 ? 's' : ''}</span>
              </div>
              {savings > 0 && (
                <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                  <TrendingDown className="h-3.5 w-3.5" /> {formatCurrency(savings)} savings vs next best quote
                </div>
              )}
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              This will send the purchase request to the COO for price review. Make sure all prices and evidence are correct.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => setShowSubmitConfirm(false)}>
              Go Back
            </Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-[12px]"
              onClick={() => {
                setShowSubmitConfirm(false);
                canvass.handleSubmitQuotation(quotationAttachments.length);
              }}
              disabled={canvass.isSubmitting}
            >
              {canvass.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Attachment Preview ────────────────────────────── */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => { if (!o) closePreviewDialog(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[14px]">
              <FileText className="h-4 w-4" /> {previewDialog.name || 'Attachment Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {previewDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            ) : previewDialog.url && previewDialog.mimeType === 'application/pdf' ? (
              <iframe src={previewDialog.url} title={previewDialog.name} className="h-[70vh] w-full rounded-md border" />
            ) : previewDialog.url ? (
              <img src={previewDialog.url} alt={previewDialog.name} className="max-h-[70vh] max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Item Photo ───────────────────────────────────── */}
      <Dialog open={itemPhotoDialog.open} onOpenChange={(o) => { if (!o) closeItemPhotoDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[14px]">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {itemPhotoDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            ) : itemPhotoDialog.url ? (
              <img src={itemPhotoDialog.url} alt="Reference photo" className="max-h-[60vh] max-w-full rounded-md object-contain" />
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
      {done ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
      )}
      <span className={done ? 'text-zinc-700 font-medium' : 'text-zinc-400'}>{label}</span>
    </div>
  );
}
