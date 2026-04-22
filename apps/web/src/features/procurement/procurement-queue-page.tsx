import { useState } from 'react';
import {
  ShoppingCart, Eye, CheckCircle2, RotateCcw, ExternalLink,
  Loader2, AlertCircle, User, Building2, Calendar, Hash,
  X, Paperclip, Download,
} from 'lucide-react';
import { PrStatus, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequests, usePurchaseRequest, useSubmitQuotation, useReturnForInfo } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { PurchaseRequest, QuotationReturn } from '@prams/shared';

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

function ProcurementDetailModal({ prId, open, onOpenChange }: ProcurementDetailModalProps) {
  const { toast } = useToast();
  const submitQuotation = useSubmitQuotation();
  const returnMutation = useReturnForInfo();

  const { data, isLoading } = usePurchaseRequest(prId ?? '');
  const pr = data?.data;

  const [actionStep, setActionStep] = useState<'quotation' | 'return' | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});

  const procItems = pr?.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? [];

  const requester = pr?.requesterId as unknown as {
    firstName: string; lastName: string; email: string; employeeId: string;
  } | null;
  const department = pr?.departmentId as unknown as { name: string; code: string } | null;

  const handleClose = () => {
    setActionStep(null);
    setReturnNote('');
    setPrices({});
    onOpenChange(false);
  };

  const startQuotation = () => {
    const initial = Object.fromEntries(procItems.map((i) => [i._id, '']));
    setPrices(initial);
    setActionStep('quotation');
  };

  const handleSubmitQuotation = async () => {
    const items = procItems.map((item) => ({
      itemId: item._id,
      quotedUnitPrice: Number(prices[item._id]) || 0,
    }));
    const invalid = items.filter((i) => i.quotedUnitPrice <= 0);
    if (invalid.length > 0) {
      toast({ title: 'All prices required', description: 'Enter a price for every procurement item.', variant: 'error' });
      return;
    }
    try {
      await submitQuotation.mutateAsync({ id: prId!, items });
      toast({ title: 'Quotation submitted', description: 'PR has been forwarded for approval.', variant: 'success' });
      handleClose();
    } catch {
      toast({ title: 'Failed to submit quotation', variant: 'error' });
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
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
  };

  return (
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
                  {/* Description & Justification */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{pr.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Justification</p>
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
                          {(pr.attachments as Array<{ _id: string; originalName: string; size: number }>).map((att) => (
                            <div key={att._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{att.originalName}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {(att.size / 1024).toFixed(0)} KB
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => purchaseRequestsApi.downloadAttachment(pr._id, att._id, att.originalName)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="w-64 shrink-0 border-l overflow-y-auto p-4 space-y-4">
                  {/* Return History */}
                  <p className="text-xs font-medium text-muted-foreground">Return History</p>
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

                  {/* Items to quote summary */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Items to Quote ({procItems.length})
                    </p>
                    {procItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">All items are online-sourced.</p>
                    ) : (
                      procItems.map((item) => (
                        <div key={item._id} className="text-xs space-y-0.5">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-muted-foreground">{item.quantity} {item.unit}</p>
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Review the details above before taking action.
                </p>
                <div className="flex items-center gap-2">
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
                <div className="flex items-end gap-3">
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
                  <div className="flex items-center gap-2 pb-0.5">
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
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium">Enter quoted unit prices</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto">
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
                        value={prices[item._id] ?? ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [item._id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
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
          description="All submitted purchase requests have been processed."
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
