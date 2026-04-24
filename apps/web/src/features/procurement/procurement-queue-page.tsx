import { useState } from 'react';
import {
  ShoppingCart, Eye, CheckCircle2, RotateCcw,
  Loader2, AlertCircle, User, Building2, Calendar, Hash,
  X, Paperclip, Download, Camera, ImageIcon, FileText, Upload, Trash2,
  Plus,
} from 'lucide-react';
import { ATTACHMENT_CATEGORY_LABELS, AttachmentCategory, PrStatus, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequests, usePurchaseRequest, useSubmitQuotation, useReturnForInfo } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import { useSuppliers } from '@/hooks/use-suppliers';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseRequest, QuotationReturn, SubmitQuotationDto } from '@prams/shared';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function canPreviewAttachment(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'pending_quotation': return 'warning' as const;
    case 'returned_for_info': return 'warning' as const;
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

// ─── Procurement Detail Modal ─────────────────────────────────────────────────

interface ProcurementDetailModalProps {
  prId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DraftCanvassEntry {
  localId: string;
  supplierId: string;
  remarks: string;
  isSelected: boolean;
  quotedPrices: Record<string, string>;
}

function ProcurementDetailModal({ prId, open, onOpenChange }: ProcurementDetailModalProps) {
  const { toast } = useToast();
  const submitQuotation = useSubmitQuotation();
  const returnMutation = useReturnForInfo();

  const { data, isLoading, refetch } = usePurchaseRequest(prId ?? '');
  const { data: suppliersData } = useSuppliers({ limit: 100, status: 'active' });
  const pr = data?.data;
  const suppliers = suppliersData?.data ?? [];

  const [actionStep, setActionStep] = useState<'quotation' | 'return' | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [canvassEntries, setCanvassEntries] = useState<DraftCanvassEntry[]>([]);
  const [canvassJustification, setCanvassJustification] = useState('');
  const [isUploadingQuoteFile, setIsUploadingQuoteFile] = useState(false);
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

  const procItems = pr?.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? [];
  const quotationAttachments = (pr?.attachments ?? []).filter((att) => att.category === AttachmentCategory.CANVASS);
  const supportingAttachments = (pr?.attachments ?? []).filter((att) => att.category !== AttachmentCategory.CANVASS);

  const requester = pr?.requesterId as unknown as {
    firstName: string; lastName: string; email: string; employeeId: string;
  } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;

  const stagePresentation = {
    title: 'Procurement Review Workspace',
    description: 'Validate requester context, then build the supplier canvass, upload evidence, and choose one winning supplier.',
    tone: 'border-amber-300 bg-amber-50 text-amber-900',
  };

  const handleClose = () => {
    if (previewDialog.url) {
      URL.revokeObjectURL(previewDialog.url);
    }
    if (itemPhotoDialog.url) {
      URL.revokeObjectURL(itemPhotoDialog.url);
    }
    setPreviewDialog({ open: false, url: null, mimeType: '', name: '', loading: false });
    setItemPhotoDialog({ open: false, url: null, loading: false });
    setActionStep(null);
    setReturnNote('');
    setCanvassEntries([]);
    setCanvassJustification('');
    onOpenChange(false);
  };

  const buildEmptyCanvassEntry = (index: number): DraftCanvassEntry => ({
    localId: `new-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    supplierId: '',
    remarks: '',
    isSelected: index === 0,
    quotedPrices: Object.fromEntries(procItems.map((item) => [item._id, ''])),
  });

  const startQuotation = () => {
    const existing = (pr?.canvassEntries ?? []).map((entry, index) => ({
      localId: entry._id ?? `existing-${index}`,
      supplierId: typeof entry.supplierId === 'string' ? entry.supplierId : entry.supplierId._id,
      remarks: entry.remarks ?? '',
      isSelected: entry.isSelected,
      quotedPrices: Object.fromEntries(
        procItems.map((item) => {
          const quotedItem = entry.quotedItems.find((candidate) => candidate.itemId === item._id);
          return [item._id, quotedItem ? String(quotedItem.unitPrice) : ''];
        }),
      ),
    }));
    const initialEntries = existing.length > 0
      ? existing
      : Array.from({ length: 3 }, (_, index) => buildEmptyCanvassEntry(index));
    const hasSelected = initialEntries.some((entry) => entry.isSelected);
    setCanvassEntries(
      initialEntries.map((entry, index) => ({
        ...entry,
        isSelected: hasSelected ? entry.isSelected : index === 0,
      })),
    );
    setCanvassJustification(pr?.canvassJustification ?? '');
    setActionStep('quotation');
  };

  const handleSubmitQuotation = async () => {
    if (canvassEntries.length === 0) {
      toast({ title: 'Canvass entries required', description: 'Add at least one supplier canvass entry.', variant: 'error' });
      return;
    }

    const selectedCount = canvassEntries.filter((entry) => entry.isSelected).length;
    if (selectedCount !== 1) {
      toast({ title: 'Winning supplier required', description: 'Select exactly one winning supplier.', variant: 'error' });
      return;
    }

    const selectedSuppliers = canvassEntries.map((entry) => entry.supplierId).filter(Boolean);
    if (selectedSuppliers.length !== canvassEntries.length) {
      toast({ title: 'Supplier required', description: 'Select a supplier for every canvass entry.', variant: 'error' });
      return;
    }

    if (new Set(selectedSuppliers).size !== selectedSuppliers.length) {
      toast({ title: 'Duplicate suppliers', description: 'Each canvass entry must use a different supplier.', variant: 'error' });
      return;
    }

    const trimmedJustification = canvassJustification.trim();
    if (canvassEntries.length < 3 && !trimmedJustification) {
      toast({ title: 'Justification required', description: 'Explain why fewer than 3 suppliers were canvassed.', variant: 'error' });
      return;
    }

    if (quotationAttachments.length === 0) {
      toast({ title: 'Quotation evidence required', description: 'Upload at least one canvass or supplier quotation before submitting.', variant: 'error' });
      return;
    }

    const payloadEntries: SubmitQuotationDto['canvassEntries'] = [];

    for (const entry of canvassEntries) {
      const supplier = suppliers.find((candidate: { _id: string; companyName: string }) => candidate._id === entry.supplierId);
      if (!supplier) {
        toast({ title: 'Invalid supplier', description: 'One of the selected suppliers is no longer available.', variant: 'error' });
        return;
      }

      const quotedItems = [];
      let hasInvalidPrice = false;
      for (const item of procItems) {
        const unitPrice = Number(entry.quotedPrices[item._id]);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          hasInvalidPrice = true;
          break;
        }
        quotedItems.push({
          itemId: item._id,
          description: item.description,
          unitPrice,
          totalPrice: item.quantity * unitPrice,
          remarks: undefined,
        });
      }

      if (hasInvalidPrice) {
        toast({ title: 'All prices required', description: `Enter a valid quoted price for every item under ${supplier.companyName}.`, variant: 'error' });
        return;
      }

      payloadEntries.push({
        supplierId: supplier._id,
        supplierName: supplier.companyName,
        quotedItems,
        totalQuotedAmount: quotedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        remarks: entry.remarks.trim() || undefined,
        isSelected: entry.isSelected,
      });
    }

    try {
      await submitQuotation.mutateAsync({
        id: prId!,
        payload: {
          canvassEntries: payloadEntries,
          canvassJustification: trimmedJustification || undefined,
        },
      });
      toast({ title: 'Quotation submitted', description: 'PR has been forwarded for approval.', variant: 'success' });
      handleClose();
    } catch (error) {
      toast({
        title: 'Failed to submit quotation',
        description: getErrorMessage(error, 'Check supplier selection, prices, and quotation evidence, then try again.'),
        variant: 'error',
      });
    }
  };

  const addCanvassEntry = () => {
    setCanvassEntries((current) => [...current, buildEmptyCanvassEntry(current.length)]);
  };

  const removeCanvassEntry = (localId: string) => {
    setCanvassEntries((current) => {
      if (current.length === 1) return current;
      const next = current.filter((entry) => entry.localId !== localId);
      if (!next.some((entry) => entry.isSelected) && next[0]) {
        next[0] = { ...next[0], isSelected: true };
      }
      return next;
    });
  };

  const updateCanvassEntry = (localId: string, patch: Partial<DraftCanvassEntry>) => {
    setCanvassEntries((current) => current.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry)));
  };

  const setWinningSupplier = (localId: string) => {
    setCanvassEntries((current) => current.map((entry) => ({ ...entry, isSelected: entry.localId === localId })));
  };

  const handleUploadQuotationEvidence = async (file: File | null) => {
    if (!file || !pr) return;
    try {
      setIsUploadingQuoteFile(true);
      await purchaseRequestsApi.uploadQuotationAttachment(pr._id, file);
      await refetch();
      toast({ title: 'Quotation evidence uploaded', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Failed to upload quotation evidence',
        description: getErrorMessage(error, 'Upload did not complete. Try again with a supported file type.'),
        variant: 'error',
      });
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
      toast({
        title: 'Failed to remove quotation evidence',
        description: getErrorMessage(error, 'The file could not be removed right now.'),
        variant: 'error',
      });
    }
  };

  const handleReturnForInfo = async () => {
    if (!returnNote.trim()) {
      toast({ title: 'Note required', description: 'Explain what additional info is needed.', variant: 'error' });
      return;
    }
    try {
      await returnMutation.mutateAsync({ id: prId!, note: returnNote.trim() });
      toast({ title: 'Returned for info', description: 'Requester has been notified.', variant: 'success' });
      handleClose();
    } catch (error) {
      toast({
        title: 'Action failed',
        description: getErrorMessage(error, 'The request could not be returned for more information.'),
        variant: 'error',
      });
    }
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
      <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-5xl h-[88vh] flex flex-col rounded-xl border bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogPrimitive.Title className="sr-only">Procurement Queue — PR Detail</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Review purchase request details and submit quotation or return for info</DialogPrimitive.Description>

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
                    {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
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
            <DialogPrimitive.Close
              className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
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
                  <div className={`rounded-xl border px-4 py-3 ${stagePresentation.tone}`}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-white/80 p-2">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{stagePresentation.title}</p>
                        <p className="text-sm leading-6 text-current/80">{stagePresentation.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Requester Docs</p>
                      <p className="mt-1 text-lg font-semibold">{supportingAttachments.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote Files</p>
                      <p className="mt-1 text-lg font-semibold">{quotationAttachments.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Items to Quote</p>
                      <p className="mt-1 text-lg font-semibold">{procItems.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Canvass Entries</p>
                      <p className="mt-1 text-lg font-semibold">{pr.canvassEntries?.length ?? 0}</p>
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

                  {/* Quotation Evidence */}
                  <>
                    <Separator />
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Quotation Evidence ({quotationAttachments.length})
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Procurement-owned files only: supplier quotations, canvass sheets, or comparison documents used to justify pricing.
                          </p>
                        </div>
                        <label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={(e) => {
                              handleUploadQuotationEvidence(e.target.files?.[0] ?? null);
                              e.target.value = '';
                            }}
                            disabled={isUploadingQuoteFile || submitQuotation.isPending}
                          />
                          <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                            <span>
                              {isUploadingQuoteFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              Upload Quote
                            </span>
                          </Button>
                        </label>
                      </div>
                      {quotationAttachments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No procurement quotation evidence uploaded yet.</p>
                      ) : (
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  title="Remove"
                                  onClick={() => handleRemoveQuotationEvidence(att._id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>

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
                                  <div key={quotedItem.itemId} className="flex items-center justify-between text-xs">
                                    <span className="truncate pr-3">{quotedItem.description}</span>
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

                  {/* Requester Attachments */}
                  {supportingAttachments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Supporting Documents ({supportingAttachments.length})
                        </p>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          Requester-owned context files. Review these alongside specs and item photos before quoting.
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

                {/* Right sidebar */}
                <div className="w-72 shrink-0 border-l bg-muted/10 overflow-y-auto p-4 space-y-4">
                  {/* Return History */}
                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground">Return History</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Prior procurement requests for clarification.
                      </p>
                    </div>
                  {!pr.quotationReturnHistory || pr.quotationReturnHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No returns yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...pr.quotationReturnHistory].reverse().map((entry: QuotationReturn) => {
                        const returnedBy = typeof entry.returnedBy === 'object' && entry.returnedBy
                          ? `${entry.returnedBy.firstName} ${entry.returnedBy.lastName}`
                          : 'Procurement';
                        return (
                          <div key={entry._id} className="text-xs space-y-1">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="font-medium text-amber-800">Returned for Info</span>
                            </div>
                            <p className="text-muted-foreground">{returnedBy}</p>
                            <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
                              <p className="text-amber-800">"{entry.note}"</p>
                            </div>
                            <p className="text-muted-foreground/70">{formatDateTime(entry.returnedAt)}</p>
                            <Separator className="mt-1" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>

                  {/* Items to quote summary */}
                  <div className="rounded-xl border bg-background p-4 shadow-sm space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Items to Quote ({procItems.length})
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Quick checklist of the procurement-sourced items included in this request.
                      </p>
                    </div>
                  {procItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">All items are online-sourced.</p>
                    ) : (
                      procItems.map((item) => (
                        <div key={item._id} className="text-xs space-y-0.5">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-muted-foreground">{item.quantity} {item.unit}</p>
                          {typeof item.selectedSupplierId === 'object' && item.selectedSupplierId?.companyName && (
                            <p className="text-muted-foreground">Selected supplier: {item.selectedSupplierId.companyName}</p>
                          )}
                          {item.specifications && (
                            <p className="text-muted-foreground italic">{item.specifications}</p>
                          )}
                          <Separator className="mt-2" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer — action area */}
          <div className="border-t px-6 py-4 shrink-0">
            {actionStep === null ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  Confirm requester context first, then upload quotation evidence and select one winning supplier.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    onClick={() => { setReturnNote(''); setActionStep('return'); }}
                    disabled={!pr || returnMutation.isPending || submitQuotation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" /> Return for Info
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={startQuotation}
                    disabled={!pr || procItems.length === 0 || submitQuotation.isPending || returnMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Submit Quotation
                  </Button>
                </div>
              </div>
            ) : actionStep === 'return' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium">Return for more information</p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="return-note" className="text-xs">
                      Note to Requester <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="return-note"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="e.g. Please specify the exact model number, wattage, and whether brand equivalents are acceptable..."
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pb-0.5">
                    <Button variant="outline" onClick={() => setActionStep(null)} disabled={returnMutation.isPending}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      className="border-amber-500 text-amber-700 hover:bg-amber-50"
                      onClick={handleReturnForInfo}
                      disabled={returnMutation.isPending || !returnNote.trim()}
                    >
                      {returnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Confirm Return
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Quotation step */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium">Build supplier canvass and select the winner</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCanvassEntry}>
                    <Plus className="h-4 w-4" />
                    Add Supplier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Capture one canvass entry per supplier. Quote every procurement item under each supplier, then mark one winner before forwarding.
                </p>
                <p className="text-xs text-muted-foreground">
                  Requester supporting documents stay read-only here. Only the quotation evidence section above is for Procurement uploads.
                </p>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {canvassEntries.map((entry, index) => {
                    const supplierLabel = suppliers.find((candidate: { _id: string; companyName: string }) => candidate._id === entry.supplierId)?.companyName;
                    const totalQuotedAmount = procItems.reduce((sum, item) => {
                      const price = Number(entry.quotedPrices[item._id]) || 0;
                      return sum + (price * item.quantity);
                    }, 0);
                    return (
                      <div key={entry.localId} className={`rounded-lg border p-4 space-y-3 ${entry.isSelected ? 'border-emerald-300 bg-emerald-50/50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Supplier {index + 1}</p>
                            {supplierLabel && (
                              <p className="text-xs text-muted-foreground">
                                Current total: {formatCurrency(totalQuotedAmount)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={entry.isSelected ? 'default' : 'outline'}
                              className={entry.isSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                              onClick={() => setWinningSupplier(entry.localId)}
                            >
                              {entry.isSelected ? 'Winning Supplier' : 'Set Winner'}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeCanvassEntry(entry.localId)}
                              disabled={canvassEntries.length === 1}
                              title="Remove supplier"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Supplier</Label>
                            <Select
                              value={entry.supplierId || 'none'}
                              onValueChange={(value) => updateCanvassEntry(entry.localId, { supplierId: value === 'none' ? '' : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Select supplier</SelectItem>
                                {suppliers.map((supplier: { _id: string; companyName: string }) => (
                                  <SelectItem key={supplier._id} value={supplier._id}>
                                    {supplier.companyName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Label className="text-xs">Remarks</Label>
                            <textarea
                              rows={2}
                              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                              placeholder="Optional canvass notes"
                              value={entry.remarks}
                              onChange={(e) => updateCanvassEntry(entry.localId, { remarks: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {procItems.map((item) => (
                              <div key={item._id} className="space-y-1">
                                <Label className="text-xs leading-tight">
                                  {item.description}
                                  <span className="text-muted-foreground ml-1">({item.quantity} {item.unit})</span>
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                  value={entry.quotedPrices[item._id] ?? ''}
                                  onChange={(e) => updateCanvassEntry(entry.localId, {
                                    quotedPrices: { ...entry.quotedPrices, [item._id]: e.target.value },
                                  })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {canvassEntries.length < 3 && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Justification for Fewer than 3 Suppliers <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Explain why only one or two suppliers could be canvassed."
                      value={canvassJustification}
                      onChange={(e) => setCanvassJustification(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => setActionStep(null)} disabled={submitQuotation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSubmitQuotation}
                    disabled={submitQuotation.isPending}
                  >
                    {submitQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm Quotation
                  </Button>
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
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

// ─── PR Card ─────────────────────────────────────────────────────────────────

function PrCard({ pr, onViewDetails }: { pr: PurchaseRequest; onViewDetails: (id: string) => void }) {
  const requester = pr.requesterId as unknown as { firstName: string; lastName: string } | null;
  const department = pr.departmentId as unknown as { name: string } | null;
  const procCount = pr.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{pr.title}</p>
              <Badge variant={statusVariant(pr.status)} className="text-[11px]">
                {PR_STATUS_LABELS[pr.status as PrStatus] || pr.status}
              </Badge>
              <Badge variant={priorityVariant(pr.priority)} className="text-[11px]">
                {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pr.prNumber} · {requester ? `${requester.firstName} ${requester.lastName}` : '—'} · {department?.name ?? '—'} · {formatDate(pr.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {procCount} item{procCount !== 1 ? 's' : ''} to quote · {formatCurrency(pr.totalAmount || 0)} estimated
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onViewDetails(pr._id)}
          >
            <Eye className="h-3.5 w-3.5" /> View Details
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ProcurementQueuePage() {
  const { data, isLoading } = usePurchaseRequests({ status: PrStatus.PENDING_QUOTATION, limit: 50 });
  const prs = (data?.data ?? []) as PurchaseRequest[];

  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Queue"
        description="Review purchase requests pending quotation and submit supplier prices."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : prs.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="No PRs awaiting quotation"
          description="All purchase requests awaiting procurement quotation have been processed."
        />
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <PrCard key={pr._id} pr={pr} onViewDetails={setSelectedPrId} />
          ))}
        </div>
      )}

      <ProcurementDetailModal
        prId={selectedPrId}
        open={selectedPrId !== null}
        onOpenChange={(open) => { if (!open) setSelectedPrId(null); }}
      />
    </div>
  );
}
