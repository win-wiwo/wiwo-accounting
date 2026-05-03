import { useState, useRef } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  XCircle,
  ShoppingCart,
  FileText,
  Truck,
  Camera,
  Package,
  ImageIcon,
  Calendar,
  CheckCircle2,
  FilePlus,
} from 'lucide-react';
import { UserRole } from '@prams/shared';
import {
  usePurchaseOrder,
  useMarkOrdered,
  useReceivePurchaseOrder,
  useUpdateArrivalDate,
  useCancelPurchaseOrder,
} from '@/hooks/use-purchase-orders';
import { resolvePhotoUrl } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PageHeader,
  Surface,
  StatusBadge,
  EmptyState,
  PrimaryButton,
  GhostButton,
  type BadgeTone,
} from '@/components/premium';

const PO_STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  ordered:   'Ordered',
  received:  'Received',
  cancelled: 'Cancelled',
};

const PO_STATUS_TONE: Record<string, BadgeTone> = {
  pending:   'warn',
  ordered:   'info',
  received:  'success',
  cancelled: 'danger',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  purchase_request: 'Purchase Request',
  job_request:      'Job Request',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PoDetailPage() {
  usePageTitle('Purchase Order');
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = usePurchaseOrder(id!);
  const markOrderedMutation = useMarkOrdered();
  const receiveMutation = useReceivePurchaseOrder();
  const updateArrivalMutation = useUpdateArrivalDate();
  const cancelMutation = useCancelPurchaseOrder();

  const po = data?.data;

  // Order dialog state
  const [orderDialog, setOrderDialog] = useState(false);
  const [orderEta, setOrderEta] = useState('');

  // Receive dialog state
  const [receiveDialog, setReceiveDialog] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivePhotos, setReceivePhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ETA update dialog
  const [etaDialog, setEtaDialog] = useState(false);
  const [newEta, setNewEta] = useState('');

  // Proof photo viewer dialog
  const [proofPhotoDialog, setProofPhotoDialog] = useState<{
    open: boolean;
    url: string | null;
    name: string;
  }>({ open: false, url: null, name: '' });

  // Cancel dialog
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPrAction, setCancelPrAction] = useState<'keep_approved' | 'requeue_canvass' | 'cancel_pr'>('keep_approved');

  const handleMarkOrdered = async () => {
    if (!po) return;
    try {
      await markOrderedMutation.mutateAsync({
        id: po._id,
        estimatedArrivalDate: orderEta || null,
      });
      toast({ title: 'Order placed', description: 'PO marked as ordered.', variant: 'success' });
      setOrderDialog(false);
      setOrderEta('');
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
  };

  const handleReceive = async () => {
    if (!po || receivePhotos.length === 0) {
      toast({ title: 'Please add at least one proof photo', variant: 'error' });
      return;
    }
    const formData = new FormData();
    receivePhotos.forEach((file) => formData.append('photos', file));
    if (receiveNotes.trim()) formData.append('notes', receiveNotes.trim());

    try {
      await receiveMutation.mutateAsync({ id: po._id, formData });
      toast({ title: 'Order received', description: 'PR creator has been notified.', variant: 'success' });
      setReceiveDialog(false);
      setReceiveNotes('');
      setReceivePhotos([]);
    } catch {
      toast({ title: 'Failed to receive order', variant: 'error' });
    }
  };

  const handleUpdateEta = async () => {
    if (!po || !newEta) return;
    try {
      await updateArrivalMutation.mutateAsync({ id: po._id, estimatedArrivalDate: newEta });
      toast({ title: 'ETA updated', variant: 'success' });
      setEtaDialog(false);
      setNewEta('');
    } catch {
      toast({ title: 'Failed to update ETA', variant: 'error' });
    }
  };

  const handleCancel = async () => {
    if (!po || !cancelReason.trim()) return;
    try {
      await cancelMutation.mutateAsync({
        id: po._id,
        reason: cancelReason.trim(),
        prAction: cancelPrAction,
      });
      const followUp =
        cancelPrAction === 'requeue_canvass'
          ? 'PR returned to procurement for re-canvassing.'
          : cancelPrAction === 'cancel_pr'
            ? 'Parent PR has also been cancelled.'
            : 'A replacement PO has been created automatically.';
      toast({ title: 'PO cancelled', description: followUp, variant: 'success' });
    } catch {
      toast({ title: 'Failed to cancel', variant: 'error' });
    }
    setCancelDialog(false);
    setCancelReason('');
    setCancelPrAction('keep_approved');
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    setReceivePhotos((prev) => [...prev, ...newFiles]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Surface><div className="p-6 space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /></div></Surface>
            <Surface><div className="p-6 space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div></Surface>
          </div>
          <Surface><div className="p-6 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /></div></Surface>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <PageHeader
          title="Purchase Order"
          description="The requested PO could not be loaded."
          actions={
            <GhostButton onClick={() => navigate('/purchase-orders')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
          }
        />
        <Surface>
          <EmptyState
            icon={<FileText />}
            title="Purchase order not found"
            description="It may have been removed or the link is incorrect."
            action={
              <GhostButton onClick={() => navigate('/purchase-orders')}>
                Back to Purchase Orders
              </GhostButton>
            }
          />
        </Surface>
      </div>
    );
  }

  const isProcurementOrAdmin =
    user?.role === UserRole.PROCUREMENT || user?.role === UserRole.ADMIN;

  const isPending = po.status === 'pending';
  const isOrdered = po.status === 'ordered';
  const isCancelled = po.status === 'cancelled';
  const isReceived = po.status === 'received';

  const canOrder = isPending && isProcurementOrAdmin;
  const canReceive = isOrdered && isProcurementOrAdmin;
  const canUpdateEta = isOrdered && isProcurementOrAdmin;
  const canCancel = (isPending || isOrdered) && isProcurementOrAdmin;

  const creator =
    po.createdBy && typeof po.createdBy === 'object'
      ? (po.createdBy as { firstName: string; lastName: string })
      : null;
  const orderer =
    po.orderedBy && typeof po.orderedBy === 'object'
      ? (po.orderedBy as { firstName: string; lastName: string })
      : null;
  const receiver =
    po.receivedBy && typeof po.receivedBy === 'object'
      ? (po.receivedBy as { firstName: string; lastName: string })
      : null;
  const sourceRequest =
    po.purchaseRequestId && typeof po.purchaseRequestId === 'object'
      ? (po.purchaseRequestId as { _id: string; prNumber?: string; title?: string })
      : null;

  const sourceNumber = po.sourceRequestNumber || sourceRequest?.prNumber || '—';
  const sourceTypeLabel = SOURCE_TYPE_LABELS[po.sourceRequestType] || po.sourceRequestType;

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={po.poNumber || 'Purchase Order'}
        description={[
          sourceNumber !== '—' ? sourceNumber : null,
          po.supplierName,
        ].filter(Boolean).join(' · ') || sourceTypeLabel}
        meta={
          <StatusBadge tone={PO_STATUS_TONE[po.status] ?? 'gray'} dot>
            {PO_STATUS_LABELS[po.status] || po.status}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <GhostButton onClick={() => navigate('/purchase-orders')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </GhostButton>
            {sourceRequest?._id && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-[13px] h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => navigate(`/purchase-requests/${sourceRequest._id}`)}
              >
                <FileText className="h-3.5 w-3.5" /> View Purchase Request
              </Button>
            )}
            {canCancel && (
              <GhostButton
                onClick={() => { setCancelReason(''); setCancelPrAction('keep_approved'); setCancelDialog(true); }}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </GhostButton>
            )}
            {canUpdateEta && (
              <GhostButton onClick={() => { setNewEta(po.estimatedArrivalDate ? new Date(po.estimatedArrivalDate).toISOString().split('T')[0] : ''); setEtaDialog(true); }}>
                <Calendar className="h-3.5 w-3.5" /> Update ETA
              </GhostButton>
            )}
            {canOrder && (
              <PrimaryButton onClick={() => setOrderDialog(true)}>
                <Truck className="h-3.5 w-3.5" /> Mark as Ordered
              </PrimaryButton>
            )}
            {canReceive && (
              <PrimaryButton onClick={() => setReceiveDialog(true)}>
                <Package className="h-3.5 w-3.5" /> Receive Order
              </PrimaryButton>
            )}
          </div>
        }
      />

      <div
        className="pr-list-section grid gap-6 lg:grid-cols-[1fr_320px]"
        style={{ animationDelay: '0.06s' }}
      >
        {/* Left column */}
        <div className="space-y-6">
          {/* Source Request */}
          <Surface>
            <PanelHeader icon={<FileText className="h-4 w-4 text-zinc-400" />} title="Source Request" />
            <div className="px-6 pb-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Request Number" value={sourceNumber} mono />
                <Field label="Source Type" value={sourceTypeLabel} />
                {sourceRequest?.title && (
                  <div className="sm:col-span-2">
                    <Field label="Title" value={sourceRequest.title} />
                  </div>
                )}
              </div>
            </div>
          </Surface>

          {/* Line Items */}
          <Surface>
            <PanelHeader title="Line Items" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/95 border-b border-zinc-100">
                  <tr>
                    <th className="h-11 px-5 w-10 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">#</th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Description</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Qty</th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Unit</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Unit Price</th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map(
                    (item: { _id: string; description: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; notes?: string }, i: number) => (
                      <tr key={item._id || i} className="border-b border-zinc-100/60 last:border-0 hover:bg-zinc-50/60 transition-colors duration-150">
                        <td className="px-5 py-4 text-[12px] text-zinc-400 tabular-nums">{i + 1}</td>
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-zinc-800">{item.description}</p>
                          {item.notes && <p className="text-[12px] text-zinc-400 mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-4 text-right text-[13px] text-zinc-700 tabular-nums">{item.quantity}</td>
                        <td className="px-5 py-4 text-[13px] text-zinc-500">{item.unit}</td>
                        <td className="px-5 py-4 text-right text-[13px] text-zinc-700 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-5 py-4 text-right text-[13px] font-semibold text-zinc-900 tabular-nums">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-zinc-100 px-6 py-4">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Total Amount</p>
                <p className="mt-1.5 text-[24px] font-bold text-zinc-900 tabular-nums">{formatCurrency(po.totalAmount)}</p>
              </div>
            </div>
          </Surface>

          {/* Canvass Entries */}
          {po.canvassEntries && po.canvassEntries.length > 0 && (
            <Surface>
              <PanelHeader title="Canvass Entries" />
              <div className="px-6 pb-6 space-y-3">
                {po.canvassEntries.map(
                  (entry: { _id: string; supplierName: string; totalQuotedAmount: number; isSelected: boolean; remarks: string }) => (
                    <div
                      key={entry._id}
                      className={`rounded-xl border p-4 transition-colors duration-150 ${
                        entry.isSelected ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-100 hover:border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-900 truncate">{entry.supplierName}</p>
                          <p className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
                            Total Quoted: {formatCurrency(entry.totalQuotedAmount)}
                          </p>
                          {entry.remarks && <p className="mt-1 text-[12px] italic text-zinc-400">{entry.remarks}</p>}
                        </div>
                        {entry.isSelected && <StatusBadge tone="success">Selected</StatusBadge>}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Surface>
          )}

          {/* Proof Photos */}
          {isReceived && po.proofPhotos && po.proofPhotos.length > 0 && (
            <Surface>
              <PanelHeader icon={<ImageIcon className="h-4 w-4 text-zinc-400" />} title="Receiving Proof Photos" />
              <div className="px-6 pb-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {po.proofPhotos.map((photo: { _id: string; storagePath: string; originalName: string }) => {
                    const photoUrl = resolvePhotoUrl(`/${photo.storagePath}`);
                    return (
                      <button
                        key={photo._id}
                        type="button"
                        onClick={() => setProofPhotoDialog({ open: true, url: photoUrl ?? null, name: photo.originalName })}
                        className="group relative aspect-square rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors"
                      >
                        <img
                          src={photoUrl}
                          alt={photo.originalName}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </button>
                    );
                  })}
                </div>
                {po.receivingNotes && (
                  <div className="mt-4 rounded-lg bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 mb-1">Receiving Notes</p>
                    <p className="text-[13px] text-zinc-700 whitespace-pre-wrap">{po.receivingNotes}</p>
                  </div>
                )}
              </div>
            </Surface>
          )}

          {po.remarks && (
            <Surface>
              <PanelHeader title="Remarks" />
              <div className="px-6 pb-6">
                <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">{po.remarks}</p>
              </div>
            </Surface>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Total Amount */}
          <Surface elevation="subtle">
            <div className="p-6 space-y-4">
              <div>
                <SidebarLabel>Total Amount</SidebarLabel>
                <p className="mt-2 text-[24px] font-bold text-zinc-900 tabular-nums leading-none">{formatCurrency(po.totalAmount)}</p>
                <p className="mt-1 text-[12px] text-zinc-400">{po.currency || 'PHP'}</p>
              </div>
            </div>
          </Surface>

          {/* Supplier */}
          <Surface elevation="subtle">
            <div className="p-6">
              <SidebarLabel>
                <span className="inline-flex items-center gap-1.5"><ShoppingCart className="h-3 w-3" /> Supplier</span>
              </SidebarLabel>
              <p className="mt-2 text-[13px] font-semibold text-zinc-900">
                {po.supplierName || ((po.canvassEntries?.length ?? 0) === 0 ? 'Online' : '—')}
              </p>
            </div>
          </Surface>

          {/* Fulfillment Timeline */}
          <Surface elevation="subtle">
            <div className="p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-4">Fulfillment Timeline</p>
              {(() => {
                const nodes: { id: string; icon: React.ReactNode; title: string; actor?: string; date: string; detail?: string; pulse?: boolean }[] = [];

                nodes.push({
                  id: 'created',
                  icon: <FilePlus className="h-4 w-4 text-blue-600" />,
                  title: 'PO Created',
                  actor: creator ? `${creator.firstName} ${creator.lastName}` : undefined,
                  date: po.createdAt,
                });

                if (orderer) {
                  nodes.push({
                    id: 'ordered',
                    icon: <ShoppingCart className="h-4 w-4 text-violet-600" />,
                    title: 'Ordered',
                    actor: `${orderer.firstName} ${orderer.lastName}`,
                    date: po.orderedAt!,
                  });
                }

                if (po.estimatedArrivalDate) {
                  nodes.push({
                    id: 'eta',
                    icon: <Calendar className="h-4 w-4 text-blue-500" />,
                    title: 'Estimated Arrival',
                    date: po.estimatedArrivalDate,
                  });
                }

                if (receiver) {
                  nodes.push({
                    id: 'received',
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                    title: 'Received',
                    actor: `${receiver.firstName} ${receiver.lastName}`,
                    date: po.receivedAt!,
                  });
                }

                if (isCancelled) {
                  nodes.push({
                    id: 'cancelled',
                    icon: <XCircle className="h-4 w-4 text-red-500" />,
                    title: 'Cancelled',
                    detail: po.cancellationReason || undefined,
                    date: po.updatedAt ?? po.createdAt,
                  });
                }

                // Show awaiting pulse for non-terminal states
                const showPulse = !isReceived && !isCancelled;

                return (
                  <div className="relative">
                    {(nodes.length > 1 || showPulse) && (
                      <div className="absolute left-[11px] top-[22px] bottom-8 w-px bg-zinc-200" />
                    )}
                    <div className="space-y-5">
                      {nodes.map((node) => (
                        <div key={node.id} className="flex gap-3 relative">
                          <div className="mt-0.5 shrink-0 z-[1] rounded-full bg-white p-[3px]">
                            {node.icon}
                          </div>
                          <div className="flex-1 min-w-0 pb-0.5">
                            <span className="text-[13px] font-semibold text-zinc-800">{node.title}</span>
                            {node.actor && <p className="text-[12px] text-zinc-500 mt-0.5">by {node.actor}</p>}
                            <p className="mt-1 text-[11px] tabular-nums text-zinc-400">
                              {node.id === 'eta' ? formatDate(node.date) : formatDateTime(node.date)}
                            </p>
                            {node.detail && (
                              <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
                                <p className="text-[12px] text-zinc-500 leading-relaxed whitespace-pre-wrap italic">"{node.detail}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {showPulse && (
                        <div className="flex gap-3 relative">
                          <div className="mt-1 shrink-0 z-[1] flex items-center justify-center w-[22px]">
                            <span className="block h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-zinc-400">
                              {isPending ? 'Awaiting order placement' : 'Awaiting delivery'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Surface>
        </div>
      </div>

      {/* Mark as Ordered Dialog */}
      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Ordered</DialogTitle>
            <DialogDescription>
              Confirm that this order has been placed with the supplier. Optionally set an estimated arrival date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Estimated Arrival Date</Label>
            <DatePicker
              value={orderEta}
              onChange={(v) => setOrderEta(v)}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Select estimated arrival..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialog(false)}>Cancel</Button>
            <PrimaryButton onClick={handleMarkOrdered} disabled={markOrderedMutation.isPending}>
              <Truck className="h-3.5 w-3.5" /> {markOrderedMutation.isPending ? 'Saving…' : 'Mark as Ordered'}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog — mobile-friendly with camera support */}
      <Dialog open={receiveDialog} onOpenChange={(open) => { setReceiveDialog(open); if (!open) { setReceivePhotos([]); setReceiveNotes(''); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Order</DialogTitle>
            <DialogDescription>
              Take photos of the received items as proof of delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo capture area — optimized for mobile */}
            <div>
              <Label>Proof Photos <span className="text-destructive">*</span></Label>
              <div className="mt-2 space-y-3">
                {receivePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {receivePhotos.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setReceivePhotos((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-[13px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100 transition-colors active:bg-zinc-200"
                >
                  <Camera className="h-5 w-5 text-zinc-400" />
                  {receivePhotos.length === 0 ? 'Take Photo or Choose File' : 'Add More Photos'}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="receive-notes">Receiving Notes</Label>
              <textarea
                id="receive-notes"
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:shadow-focus"
                placeholder="Optional notes about the received items..."
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(false)}>Cancel</Button>
            <PrimaryButton
              onClick={handleReceive}
              disabled={receiveMutation.isPending || receivePhotos.length === 0}
            >
              <Package className="h-3.5 w-3.5" /> {receiveMutation.isPending ? 'Receiving…' : 'Confirm Received'}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update ETA Dialog */}
      <Dialog open={etaDialog} onOpenChange={setEtaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Estimated Arrival</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New Estimated Arrival Date</Label>
            <DatePicker
              value={newEta}
              onChange={(v) => setNewEta(v)}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Select new arrival date..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtaDialog(false)}>Cancel</Button>
            <PrimaryButton onClick={handleUpdateEta} disabled={updateArrivalMutation.isPending || !newEta}>
              {updateArrivalMutation.isPending ? 'Saving…' : 'Update ETA'}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog open={cancelDialog} onOpenChange={(open) => { setCancelDialog(open); if (!open) { setCancelReason(''); setCancelPrAction('keep_approved'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>This purchase order will be permanently cancelled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason <span className="text-destructive">*</span></Label>
              <textarea
                id="cancel-reason"
                rows={3}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:shadow-focus"
                placeholder="Why is this PO being cancelled?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">What should happen to the PR?</Label>
              <div className="space-y-2">
                {(([
                  { value: 'keep_approved', title: 'Keep PR approved', hint: 'Issue a new PO from the existing canvass (e.g. wrong supplier picked, duplicate PO).' },
                  // Re-canvass only applies if there were procurement items canvassed.
                  ...((po.canvassEntries?.length ?? 0) > 0
                    ? [{ value: 'requeue_canvass', title: 'Re-canvass', hint: 'Need still exists but this supplier can\'t fulfill — return PR to procurement to source again.' }]
                    : []),
                  { value: 'cancel_pr', title: 'Cancel the PR too', hint: 'Need is gone, duplicate, or budget pulled. PR is closed permanently.' },
                ]) as ReadonlyArray<{ value: 'keep_approved' | 'requeue_canvass' | 'cancel_pr'; title: string; hint: string }>).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      cancelPrAction === opt.value
                        ? 'border-zinc-400 bg-zinc-50'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-pr-action"
                      value={opt.value}
                      checked={cancelPrAction === opt.value}
                      onChange={() => setCancelPrAction(opt.value)}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-800">{opt.title}</p>
                      <p className="text-[11.5px] text-zinc-500 leading-snug mt-0.5">{opt.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelDialog(false); setCancelReason(''); setCancelPrAction('keep_approved'); }}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending || !cancelReason.trim()}>
              <XCircle className="h-4 w-4" /> Cancel PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Photo Viewer Dialog */}
      <Dialog
        open={proofPhotoDialog.open}
        onOpenChange={(o) => {
          if (!o) setProofPhotoDialog({ open: false, url: null, name: '' });
        }}
      >
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Receiving Proof Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-[60vh] bg-zinc-50 rounded-md photo-reveal">
            {proofPhotoDialog.url ? (
              <img
                src={proofPhotoDialog.url}
                alt={proofPhotoDialog.name || 'Proof photo'}
                className="max-w-full max-h-full rounded-md object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PanelHeader({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">{icon}{title}</h2>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">{label}</p>
      <p className={`mt-1.5 text-[13px] text-zinc-800 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{children}</p>;
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}
