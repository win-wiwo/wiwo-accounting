import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Pencil,
  Send,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '@prams/shared';
import {
  usePurchaseOrders,
  usePoStats,
  useSubmitPurchaseOrder,
  useCancelPurchaseOrder,
} from '@/hooks/use-purchase-orders';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// ─── Types ───────────────────────────────────────────────

type PoRow = {
  _id: string;
  poNumber?: string;
  sourceRequestNumber?: string | null;
  sourceRequestType: string;
  supplierId?: { _id: string; companyName: string; category?: string | null } | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  issuedAt?: string | null;
  approvedAt?: string | null;
  purchaseRequestId?: { prNumber?: string; title?: string } | null;
  remarks?: string | null;
};

// ─── Constants ───────────────────────────────────────────

const PO_STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  approved:  'Approved',
  issued:    'Issued',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-zinc-100 text-zinc-500',
  submitted: 'bg-blue-50 text-blue-700',
  approved:  'bg-violet-50 text-violet-700',
  issued:    'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-500',
};

const STATUS_DOT: Record<string, string> = {
  draft:     'bg-zinc-300',
  submitted: 'bg-blue-400',
  approved:  'bg-violet-500',
  issued:    'bg-emerald-400',
  cancelled: 'bg-red-400',
};

const SOURCE_LABELS: Record<string, string> = {
  purchase_request: 'Purchase Request',
  job_request:      'Job Request',
};

// ─── Helpers ─────────────────────────────────────────────

function formatCurrency(amount: number) {
  if (amount >= 1_000_000)
    return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)
    return `₱${(amount / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);
}

function formatCurrencyFull(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function dateLabel(d: string | undefined | null): string {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

// ─── Component ───────────────────────────────────────────

export function PoListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = ([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user?.role ?? '');
  const canApprove = ([UserRole.COO, UserRole.CEO, UserRole.ADMIN] as string[]).includes(user?.role ?? '');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortValue, setSortValue] = useState('createdAt:desc');

  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; poId: string; poNumber: string }>({
    open: false, poId: '', poNumber: '',
  });
  const [cancelReason, setCancelReason] = useState('');

  const [sortField, sortOrder] = sortValue.split(':') as [string, 'asc' | 'desc'];

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: 15,
    search: search || undefined,
    status: statusFilter || undefined,
    sourceRequestType: sourceFilter || undefined,
    sort: sortField,
    order: sortOrder,
  });

  const { data: stats } = usePoStats();
  const submitMutation = useSubmitPurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const pos = (data?.data ?? []) as PoRow[];
  const meta = data?.meta;

  const hasFilters = !!search || !!statusFilter || !!sourceFilter;

  const [btnHover, setBtnHover] = useState(false);

  const handleSubmit = async (id: string, poNumber: string) => {
    try {
      await submitMutation.mutateAsync(id);
      toast({ title: `${poNumber} submitted`, description: 'Routed for approval.', variant: 'success' });
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelMutation.mutateAsync({ id: cancelDialog.poId, reason: cancelReason });
      toast({ title: `${cancelDialog.poNumber} cancelled`, variant: 'success' });
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
    setCancelDialog({ open: false, poId: '', poNumber: '' });
    setCancelReason('');
  };

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div
        className="pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: '0s' }}
      >
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
            Purchase Orders
          </h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">
            Create, manage, and track purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {stats && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
                {stats.total} Total
              </span>
              {stats.open > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 tabular-nums">
                  {stats.open} Open
                </span>
              )}
              {stats.issued > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700 tabular-nums">
                  {stats.issued} Issued
                </span>
              )}
              {stats.activeValue > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-700 tabular-nums">
                  {formatCurrency(stats.activeValue)} Active
                </span>
              )}
            </>
          )}
          {canCreate && (
            <button
              onClick={() => navigate('/purchase-orders/new')}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                background: btnHover
                  ? 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)'
                  : 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                boxShadow: btnHover
                  ? '0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)'
                  : '0 1px 3px rgba(0,0,0,0.15)',
                transform: btnHover ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New PO
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        style={{ animationDelay: '0.04s' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by PO number, source, or project..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="peer h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">All Statuses</option>
              {Object.entries(PO_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">All Sources</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            <select
              value={sortValue}
              onChange={(e) => { setSortValue(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="totalAmount:desc">Highest Amount</option>
              <option value="totalAmount:asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden"
        style={{ animationDelay: '0.08s' }}
      >
        {isLoading ? (
          <div className="space-y-1 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
            ))}
          </div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 mb-5">
              <ShoppingCart className="h-7 w-7 text-zinc-300" />
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">
              {hasFilters ? 'No matching purchase orders' : 'No purchase orders yet'}
            </h3>
            <p className="text-[13px] text-zinc-500 max-w-sm">
              {hasFilters
                ? 'Try adjusting your search or filters.'
                : 'Approved requests converted to purchase orders will appear here.'}
            </p>
            {canCreate && !hasFilters && (
              <button
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/purchase-orders/new')}
              >
                <Plus className="h-3.5 w-3.5" /> Create New PO
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      PO Number
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Source
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden md:table-cell">
                      Supplier
                    </th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Amount
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Status
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden lg:table-cell">
                      Date
                    </th>
                    <th className="h-11 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po, idx) => {
                    const isDraft = po.status === 'draft';
                    const isCancelled = po.status === 'cancelled';
                    const isIssued = po.status === 'issued';

                    const supplierName = po.supplierId?.companyName ?? null;
                    const supplierCategory = po.supplierId?.category ?? null;

                    const sourceNumber = po.sourceRequestNumber
                      ?? (po.purchaseRequestId as { prNumber?: string } | null)?.prNumber
                      ?? null;
                    const sourceTypeLabel = SOURCE_LABELS[po.sourceRequestType] ?? po.sourceRequestType;

                    const dateToShow = isIssued && po.issuedAt
                      ? po.issuedAt
                      : po.createdAt;

                    return (
                      <tr
                        key={po._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/purchase-orders/${po._id}`)}
                      >
                        {/* PO Number */}
                        <td className="px-5 py-4">
                          {po.poNumber ? (
                            <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight group-hover:text-zinc-950 transition-colors">
                              {po.poNumber}
                            </span>
                          ) : (
                            <span className="font-mono text-[13px] italic text-zinc-400">Draft</span>
                          )}
                        </td>

                        {/* Source */}
                        <td className="px-5 py-4">
                          <div className="max-w-[200px]">
                            <p className="text-[13px] font-medium text-zinc-800 truncate">
                              {sourceNumber ?? '—'}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{sourceTypeLabel}</p>
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          {supplierName ? (
                            <div className="max-w-[200px]">
                              <p className="text-[13px] text-zinc-700 truncate">{supplierName}</p>
                              {supplierCategory && (
                                <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{supplierCategory}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-zinc-300 italic">No supplier</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <span className={`text-[13px] font-semibold tabular-nums ${isCancelled ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                            {formatCurrencyFull(po.totalAmount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[po.status] ?? 'bg-zinc-300'}`} />
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[po.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                              {PO_STATUS_LABELS[po.status] ?? po.status}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div>
                            <span className="text-[12px] text-zinc-400 tabular-nums whitespace-nowrap">
                              {dateLabel(dateToShow)}
                            </span>
                            {isIssued && po.issuedAt && (
                              <p className="text-[10px] text-zinc-300 mt-0.5">Issued</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all duration-150 focus:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="z-50 min-w-[168px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-in fade-in-0 zoom-in-95"
                                align="end"
                                sideOffset={4}
                              >
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 outline-none hover:bg-zinc-50 transition-colors"
                                  onSelect={() => navigate(`/purchase-orders/${po._id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5 text-zinc-400" /> View PO
                                </DropdownMenu.Item>

                                {canCreate && isDraft && (
                                  <>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 outline-none hover:bg-zinc-50 transition-colors"
                                      onSelect={() => navigate(`/purchase-orders/${po._id}/edit`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-zinc-400" /> Edit
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-blue-700 outline-none hover:bg-blue-50 transition-colors"
                                      onSelect={() => handleSubmit(po._id, po.poNumber ?? 'Draft PO')}
                                    >
                                      <Send className="h-3.5 w-3.5 text-blue-500" /> Submit for Approval
                                    </DropdownMenu.Item>
                                  </>
                                )}

                                {canApprove && po.status === 'submitted' && (
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-emerald-700 outline-none hover:bg-emerald-50 transition-colors"
                                    onSelect={() => navigate(`/purchase-orders/${po._id}`)}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Review & Approve
                                  </DropdownMenu.Item>
                                )}

                                {canCreate && !isCancelled && !isIssued && (
                                  <>
                                    <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 outline-none hover:bg-red-50 transition-colors"
                                      onSelect={() =>
                                        setCancelDialog({ open: true, poId: po._id, poNumber: po.poNumber ?? 'Draft PO' })
                                      }
                                    >
                                      <XCircle className="h-3.5 w-3.5 text-red-400" /> Cancel PO
                                    </DropdownMenu.Item>
                                  </>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ───────────────────────────────── */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                <p className="text-[12px] text-zinc-400 tabular-nums">
                  Page {meta.page} of {meta.totalPages}
                  <span className="text-zinc-300 mx-1.5">&middot;</span>
                  {meta.total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  {getPageNumbers(meta.page, meta.totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1.5 text-[12px] text-zinc-300">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`h-8 w-8 rounded-lg text-[12px] font-semibold transition-all duration-150 ${
                          p === meta.page
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= meta.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Cancel Dialog ────────────────────────────────────── */}
      {cancelDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCancelDialog({ open: false, poId: '', poNumber: '' })}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">Cancel Purchase Order</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">{cancelDialog.poNumber}</p>
              </div>
            </div>
            <p className="text-[13px] text-zinc-600 mb-4">
              This action cannot be undone. Please provide a reason for cancellation.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Supplier unavailable, budget reallocated..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none resize-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
            />
            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => { setCancelDialog({ open: false, poId: '', poNumber: '' }); setCancelReason(''); }}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel PO'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
