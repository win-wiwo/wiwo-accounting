import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { usePurchaseOrders, usePoStats } from '@/hooks/use-purchase-orders';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────

type PoRow = {
  _id: string;
  poNumber?: string;
  sourceRequestNumber?: string | null;
  sourceRequestType: string;
  supplierName?: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedArrivalDate?: string | null;
  receivedAt?: string | null;
  orderedAt?: string | null;
  purchaseRequestId?: { prNumber?: string; title?: string } | null;
  remarks?: string | null;
};

// ─── Constants ───────────────────────────────────────────

const PO_STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  ordered:   'Ordered',
  received:  'Received',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-800 border-amber-200',
  ordered:   'bg-blue-50 text-blue-700 border-blue-200',
  received:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-amber-500',
  ordered:   'bg-blue-500',
  received:  'bg-emerald-500',
  cancelled: 'bg-red-500',
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
  usePageTitle('Purchase Orders');
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [limit, setLimit] = useState(10);
  const [sortValue, setSortValue] = useState('createdAt:desc');

  const [sortField, sortOrder] = sortValue.split(':') as [string, 'asc' | 'desc'];

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortValue(`${field}:${sortOrder === 'asc' ? 'desc' : 'asc'}`);
    } else {
      setSortValue(`${field}:desc`);
    }
    setPage(1);
  }

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit,
    search: search || undefined,
    status: statusFilter || undefined,
    sourceRequestType: sourceFilter || undefined,
    sort: sortField,
    order: sortOrder,
  });

  const { data: stats } = usePoStats();

  const pos = (data?.data ?? []) as PoRow[];
  const meta = data?.meta;

  const hasFilters = !!search || !!statusFilter || !!sourceFilter;

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
            Track and manage purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {stats && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
                {stats.total} Total
              </span>
              {stats.pending > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700 tabular-nums">
                  {stats.pending} Pending
                </span>
              )}
              {stats.ordered > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 tabular-nums">
                  {stats.ordered} Ordered
                </span>
              )}
              {stats.received > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700 tabular-nums">
                  {stats.received} Received
                </span>
              )}
              {stats.activeValue > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-700 tabular-nums">
                  {formatCurrency(stats.activeValue)} Active
                </span>
              )}
            </>
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
            <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(PO_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter || 'all'} onValueChange={(v) => { setSourceFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[154px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortValue} onValueChange={(v) => { setSortValue(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[154px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">Newest First</SelectItem>
                <SelectItem value="createdAt:asc">Oldest First</SelectItem>
                <SelectItem value="totalAmount:desc">Highest Amount</SelectItem>
                <SelectItem value="totalAmount:asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
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
                : 'Purchase orders are auto-created when procurement requests are fully approved.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Order
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden lg:table-cell">
                      Title
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden md:table-cell">
                      Supplier
                    </th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      <span
                        onClick={() => toggleSort('totalAmount')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortField === 'totalAmount' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Amount
                        {sortField === 'totalAmount'
                          ? (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Status
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden lg:table-cell">
                      <span
                        onClick={() => toggleSort('createdAt')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortField === 'createdAt' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Date
                        {sortField === 'createdAt'
                          ? (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po, idx) => {
                    const isCancelled = po.status === 'cancelled';
                    const isReceived = po.status === 'received';

                    const sourceNumber = po.sourceRequestNumber
                      ?? (po.purchaseRequestId as { prNumber?: string } | null)?.prNumber
                      ?? null;
                    const sourceTitle = po.purchaseRequestId?.title ?? null;

                    const dateToShow = isReceived && po.receivedAt
                      ? po.receivedAt
                      : po.orderedAt ?? po.createdAt;

                    return (
                      <tr
                        key={po._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/purchase-orders/${po._id}`)}
                      >
                        {/* Order (PO + PR number) */}
                        <td className="px-5 py-4">
                          <div>
                            <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight group-hover:text-zinc-950 transition-colors">
                              {po.poNumber ?? '—'}
                            </span>
                            {sourceNumber && (
                              <p className="font-mono text-[11px] text-zinc-400 mt-0.5 tracking-tight">
                                {sourceNumber}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          {sourceTitle ? (
                            <p className="text-[13px] text-zinc-700 max-w-[280px] truncate">
                              {sourceTitle}
                            </p>
                          ) : (
                            <span className="text-[12px] text-zinc-300 italic">—</span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          {po.supplierName ? (
                            <div className="max-w-[200px]">
                              <p className="text-[13px] text-zinc-700 truncate">{po.supplierName}</p>
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
                          <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium leading-none ${STATUS_STYLE[po.status] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[po.status] ?? 'bg-zinc-400'}`} />
                            {PO_STATUS_LABELS[po.status] ?? po.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div>
                            <span className="text-[12px] text-zinc-400 tabular-nums whitespace-nowrap">
                              {dateLabel(dateToShow)}
                            </span>
                            {isReceived && po.receivedAt && (
                              <p className="text-[10px] text-zinc-300 mt-0.5">Received</p>
                            )}
                            {po.status === 'ordered' && po.estimatedArrivalDate && (
                              <p className="text-[10px] text-blue-400 mt-0.5">
                                ETA: {new Date(po.estimatedArrivalDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ───────────────────────────────── */}
            {meta && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-zinc-400">Rows per page</span>
                    <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-auto h-8 px-2.5 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-0">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[12px] text-zinc-400 tabular-nums">
                    {meta.totalPages > 1 && <>Page {meta.page} of {meta.totalPages}<span className="text-zinc-300 mx-1.5">&middot;</span></>}
                    {meta.total} total
                  </p>
                </div>
                {meta.totalPages > 1 && (
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
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
