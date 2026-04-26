import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Eye, CheckCircle2, RotateCcw,
  Loader2, User,
  Paperclip, Download, Camera, ImageIcon, FileText, Upload, Trash2,
  Trophy, AlertTriangle, CheckCircle, XCircle, Circle,
} from 'lucide-react';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { AttachmentCategory, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequest } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { QuotationReturn } from '@prams/shared';
import { formatCurrency, formatDate, formatDateTime, canPreviewAttachment, getErrorMessage, statusVariant } from './utils';
import { useCanvass } from './use-canvass';
import { CanvassMatrix } from './canvass-matrix';

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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; url: string | null; mimeType: string; name: string; loading: boolean }>({
    open: false, url: null, mimeType: '', name: '', loading: false,
  });
  const [itemPhotoDialog, setItemPhotoDialog] = useState<{ open: boolean; url: string | null; loading: boolean }>({
    open: false, url: null, loading: false,
  });

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
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/procurement')}>
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Button>
        <p className="text-muted-foreground">Purchase request not found.</p>
      </div>
    );
  }

  const hasReturnHistory = pr.quotationReturnHistory && pr.quotationReturnHistory.length > 0;

  const highestTotal = canvass.canvassEntries.length > 0
    ? Math.max(...canvass.canvassEntries.map((e) => procItems.reduce((s, i) => s + (Number(e.quotedPrices[i._id]) || 0) * i.quantity, 0)))
    : 0;
  const savings = selectedTotal > 0 && highestTotal > 0 ? highestTotal - selectedTotal : 0;

  return (
    <div className="space-y-0 pb-20">
      {/* ── Sticky workspace header ── */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 backdrop-blur px-4 py-3 border-b shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1" onClick={() => navigate('/procurement')}>
              <ArrowLeft className="h-3 w-3" /> Procurement Queue
            </button>
            <h1 className="text-lg font-semibold leading-tight truncate max-w-[600px]">{pr.title}</h1>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground flex-wrap">
              {pr.prNumber && <span className="font-mono text-foreground">{pr.prNumber}</span>}
              {pr.prNumber && <span>·</span>}
              <Badge variant="success" className="text-[10px]">Approved</Badge>
              <Badge variant={statusVariant(pr.status)} className="text-[10px]">{PR_STATUS_LABELS[pr.status as PrStatusType]}</Badge>
              {(pr.priority === 'urgent' || pr.priority === 'high') && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${pr.priority === 'urgent' ? 'text-red-600' : 'text-amber-600'}`}>
                  <AlertTriangle className="h-3 w-3" /> {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
                </span>
              )}
              {pr.neededByDate && <><span>·</span><span>Need by <span className="font-medium text-foreground">{formatDate(pr.neededByDate)}</span></span></>}
              <span>·</span>
              <span>{procItems.length} item{procItems.length !== 1 ? 's' : ''} to source</span>
            </div>
          </div>
          {/* Mode-switching CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {canvass.actionStep === null && <>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={() => { canvass.setReturnNote(''); canvass.setActionStep('return'); }}
                disabled={canvass.isReturning || canvass.isSubmitting}>
                <RotateCcw className="h-3.5 w-3.5" /> Request Clarification
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => canvass.startQuotation(pr)}
                disabled={procItems.length === 0 || canvass.isSubmitting || canvass.isReturning}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Add Supplier Quotes
              </Button>
            </>}
            {canvass.actionStep === 'return' && (
              <Button size="sm" variant="outline" onClick={() => canvass.setActionStep(null)} disabled={canvass.isReturning}>
                Cancel
              </Button>
            )}
            {canvass.actionStep === 'quotation' && (
              <Button size="sm" variant="outline" onClick={() => setShowDiscardConfirm(true)} disabled={canvass.isSubmitting}>
                Discard
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-column workspace ── */}
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] items-start">

        {/* LEFT: Borderless context rail (sticky) */}
        <div className="lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-108px)] lg:overflow-y-auto space-y-0 pb-4">

          {/* Requester group */}
          <div className="px-1 pb-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Requester</p>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-sm text-muted-foreground">
                {requester?.firstName?.[0] ?? <User className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{requester ? `${requester.firstName} ${requester.lastName}` : '—'}</p>
                <p className="text-xs text-muted-foreground">{department?.name ?? '—'}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span className="font-medium">{formatDate(pr.submittedAt) || '—'}</span></div>
              {pr.neededByDate && <div className="flex justify-between"><span className="text-muted-foreground">Needed by</span><span className="font-medium">{formatDate(pr.neededByDate)}</span></div>}
              {pr.projectId && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Project</span>
                  <span className="font-medium text-right truncate">{(pr.projectId as unknown as { name: string }).name}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Purpose group */}
          <div className="px-1 py-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Purpose</p>
            <p className="text-sm leading-relaxed text-foreground/85">{pr.justification}</p>
          </div>

          <Separator />

          {/* Items to source */}
          <div className="px-1 py-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Items to Source ({procItems.length})</p>
            {procItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">All items are online-sourced.</p>
            ) : (
              <div className="space-y-3">
                {procItems.map((item, i) => (
                  <div key={item._id}>
                    {i > 0 && <Separator />}
                    <div className="pt-3 first:pt-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">{item.description}</p>
                        {item.referencePhotoPath && (
                          <button type="button" onClick={() => handleViewItemPhoto(item._id)}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 hover:bg-blue-100">
                            <Camera className="h-2.5 w-2.5" /> Photo
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                      {item.specifications && <p className="text-xs text-muted-foreground/70 italic leading-relaxed">{item.specifications}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clarification history */}
          {hasReturnHistory && (
            <>
              <Separator />
              <div className="px-1 pt-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">Clarification History ({pr.quotationReturnHistory!.length})</p>
                <div className="space-y-3">
                  {[...pr.quotationReturnHistory!].reverse().map((entry: QuotationReturn) => {
                    const returnedBy = typeof entry.returnedBy === 'object' && entry.returnedBy
                      ? `${entry.returnedBy.firstName} ${entry.returnedBy.lastName}` : 'Procurement';
                    return (
                      <div key={entry._id} className="space-y-1 text-xs">
                        <p className="text-muted-foreground">{returnedBy} · {formatDateTime(entry.returnedAt)}</p>
                        <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2">
                          <p className="text-amber-800 italic leading-relaxed">"{entry.note}"</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Main workspace */}
        <div className="space-y-6 min-w-0">

          {/* Hero: Supplier Comparison (read-only) */}
          {pr.canvassEntries && pr.canvassEntries.length > 0 && canvass.actionStep !== 'quotation' && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">Supplier Comparison</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{pr.canvassEntries.length} supplier{pr.canvassEntries.length !== 1 ? 's' : ''} quoted</p>
                </div>
                {selectedTotal > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Selected total</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedTotal)}</p>
                    {savings > 0 && <p className="text-xs text-emerald-700">saves {formatCurrency(savings)}</p>}
                  </div>
                )}
              </div>
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Supplier</th>
                        {pr.canvassEntries[0]?.quotedItems.map((qi) => (
                          <th key={qi.itemId} className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">{qi.description}</th>
                        ))}
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pr.canvassEntries.map((entry) => (
                        <tr key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                          className={`border-b last:border-0 ${entry.isSelected ? 'bg-emerald-50/60' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{entry.supplierName}</span>
                              {entry.isSelected && <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5"><Trophy className="h-2.5 w-2.5" /> Winner</Badge>}
                            </div>
                            {entry.remarks && <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.remarks}</p>}
                          </td>
                          {entry.quotedItems.map((qi) => (
                            <td key={qi.itemId} className="text-right px-4 py-3 text-xs">{formatCurrency(qi.unitPrice)}</td>
                          ))}
                          <td className="text-right px-4 py-3 font-bold">{formatCurrency(entry.totalQuotedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                  <div className="mx-4 mb-4 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">Fewer than 3 suppliers — justification</p>
                    <p className="mt-1 text-sm text-amber-900">{pr.canvassJustification}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hero: Active canvass matrix */}
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

          {/* Request clarification panel */}
          {canvass.actionStep === 'return' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">Request Clarification from Requester</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="return-note" className="text-xs text-amber-800">
                  Message to Requester <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="return-note"
                  rows={4}
                  className="flex w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 resize-none"
                  placeholder="e.g. Please specify the exact model number, wattage, and whether brand equivalents are acceptable..."
                  value={canvass.returnNote}
                  onChange={(e) => canvass.setReturnNote(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Quotation Evidence */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">Quotation Evidence</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Upload supplier quote documents — PDF, XLSX, PNG, JPG.</p>
              </div>
              <label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden"
                  onChange={(e) => { handleUploadQuotationEvidence(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  disabled={isUploadingQuoteFile || canvass.isSubmitting} />
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                  <span>{isUploadingQuoteFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload</span>
                </Button>
              </label>
            </div>
            {quotationAttachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center">
                <Paperclip className="h-7 w-7 text-muted-foreground/25 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No evidence uploaded yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">At least one file required before submitting.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {quotationAttachments.map((att) => (
                  <div key={att._id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="block text-sm font-medium truncate">{att.originalName}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canPreviewAttachment(att.mimeType) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview" onClick={() => handlePreviewAttachment(att._id, att.mimeType, att.originalName)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remove" onClick={() => handleRemoveQuotationEvidence(att._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All line items */}
          <div>
            <h2 className="text-sm font-semibold mb-3">All Line Items ({pr.items.length})</h2>
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-24">Sourcing</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                      <th className="w-8 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pr.items.map((item, i) => {
                      const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                      const displayPrice = isProcurement ? (item.quotedUnitPrice ?? 0) : (item.estimatedPrice ?? 0);
                      const isPending = isProcurement && !item.quotedUnitPrice;
                      return (
                        <tr key={item._id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm leading-snug">{item.description}</p>
                            {item.specifications && <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">{item.specifications}</p>}
                          </td>
                          <td className="px-4 py-3">
                            {isProcurement
                              ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5"><ShoppingCart className="h-2.5 w-2.5" /> Procurement</Badge>
                              : <Badge variant="info" className="text-[10px] px-1.5 py-0">Online</Badge>}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isPending ? <span className="text-xs text-amber-600 italic">Awaiting quotation</span> : <span className="text-xs">{formatCurrency(displayPrice)}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                            {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : '—'}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {item.referencePhotoPath && (
                              <button type="button" onClick={() => handleViewItemPhoto(item._id)} title="View photo"
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-blue-600 hover:bg-blue-50">
                                <Camera className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 bg-muted/20">
                      <td colSpan={5} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold">
                        {procItems.some((i) => !i.quotedUnitPrice)
                          ? <span className="text-amber-600">Awaiting Quotations</span>
                          : formatCurrency(pr.totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      {canvass.actionStep === 'quotation' && (
        <StickyFooter>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <ChecklistItem done={suppliersWithIds.length >= 1} label={`${suppliersWithIds.length} supplier${suppliersWithIds.length !== 1 ? 's' : ''}`} warn={false} />
              <ChecklistItem done={allPricesFilled} label="All prices" warn={false} />
              <ChecklistItem done={hasWinner} label="Winner selected" warn={false} />
              <ChecklistItem done={hasEvidence} label={`${quotationAttachments.length} evidence`} warn={false} />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={canvass.isSubmitting || !isReady}
            >
              {canvass.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit Supplier Decision
            </Button>
          </div>
        </StickyFooter>
      )}

      {canvass.actionStep === 'return' && (
        <StickyFooter>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => canvass.setActionStep(null)} disabled={canvass.isReturning}>
              Cancel
            </Button>
            <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={canvass.handleReturnForInfo} disabled={canvass.isReturning || !canvass.returnNote.trim()}>
              {canvass.isReturning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Send Clarification
            </Button>
          </div>
        </StickyFooter>
      )}

      {/* Discard confirmation */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All supplier entries, prices, and notes you entered will be lost.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowDiscardConfirm(false); canvass.resetActions(); }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Supplier Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">
                  {selectedSupplier?.companyName ?? 'No supplier selected'}
                </span>
              </div>
              <div className="text-xl font-bold">{formatCurrency(selectedTotal)}</div>
              <p className="text-xs text-muted-foreground">
                {canvass.canvassEntries.length} supplier{canvass.canvassEntries.length !== 1 ? 's' : ''} compared · {quotationAttachments.length} evidence file{quotationAttachments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              This will send the purchase request to the COO for price review. Make sure all prices and evidence are correct.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              Go Back
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

      {/* Attachment preview dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => { if (!o) closePreviewDialog(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> {previewDialog.name || 'Attachment Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {previewDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewDialog.url && previewDialog.mimeType === 'application/pdf' ? (
              <iframe src={previewDialog.url} title={previewDialog.name} className="h-[70vh] w-full rounded-md border" />
            ) : previewDialog.url ? (
              <img src={previewDialog.url} alt={previewDialog.name} className="max-h-[70vh] max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item photo dialog */}
      <Dialog open={itemPhotoDialog.open} onOpenChange={(o) => { if (!o) closeItemPhotoDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {itemPhotoDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : itemPhotoDialog.url ? (
              <img src={itemPhotoDialog.url} alt="Reference photo" className="max-h-[60vh] max-w-full rounded-md object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistItem({ done, label, warn }: { done: boolean; label: string; warn: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : warn ? (
        <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
