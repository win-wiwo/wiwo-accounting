import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  PR_STATUS_LABELS,
  PR_STATUSES,
  PR_PRIORITY_LABELS,
  PR_PRIORITIES,
  PrStatus,
  SourcingType,
  UserRole,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
  type PurchaseRequest,
} from '@prams/shared';
import { usePurchaseRequests, usePrStats } from '@/hooks/use-purchase-requests';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

/* ── Status badge styling ─────────────────────────────── */
/* Restrained semantic palette: gray=draft, blue=in-progress, amber=attention, green=approved, red=rejected */
const statusStyle: Record<string, string> = {
  draft:              'bg-zinc-50 text-zinc-700 border-zinc-200',
  submitted:          'bg-blue-50 text-blue-700 border-blue-200',
  level1_review:      'bg-blue-50 text-blue-700 border-blue-200',
  level2_review:      'bg-blue-50 text-blue-700 border-blue-200',
  level3_review:      'bg-blue-50 text-blue-700 border-blue-200',
  pending_quotation:  'bg-blue-50 text-blue-700 border-blue-200',
  quoted:             'bg-blue-50 text-blue-700 border-blue-200',
  approved:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:           'bg-red-50 text-red-700 border-red-200',
  returned:           'bg-amber-50 text-amber-800 border-amber-200',
};

const statusDot: Record<string, string> = {
  draft:              'bg-zinc-400',
  submitted:          'bg-blue-500',
  level1_review:      'bg-blue-500',
  level2_review:      'bg-blue-500',
  level3_review:      'bg-blue-500',
  pending_quotation:  'bg-blue-500',
  quoted:             'bg-blue-500',
  approved:           'bg-emerald-500',
  completed:          'bg-emerald-500',
  rejected:           'bg-red-500',
  returned:           'bg-amber-500',
};

/* ── Priority badge styling ───────────────────────────── */
/* Quieter than status: no border, lighter tint */
const priorityStyle: Record<string, string> = {
  low:    'bg-zinc-50 text-zinc-500',
  medium: 'bg-zinc-50 text-zinc-700',
  high:   'bg-amber-50/70 text-amber-800',
  urgent: 'bg-red-50/70 text-red-700',
};

const priorityDot: Record<string, string> = {
  low:    'bg-zinc-300',
  medium: 'bg-zinc-400',
  high:   'bg-amber-500',
  urgent: 'bg-red-500',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

/** True when any procurement item still has no quoted price */
function hasPendingQuote(pr: PurchaseRequest): boolean {
  return pr.items.some(
    (item) => item.sourcingType === SourcingType.PROCUREMENT && item.totalPrice === 0,
  );
}

export function PrListPage() {
  usePageTitle('Purchase Requests');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  function toggleSort(field: 'createdAt' | 'totalAmount') {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  }

  const { data, isLoading } = usePurchaseRequests({
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    requestType: typeFilter !== 'all' ? typeFilter : undefined,
    sort: sortBy,
    order: sortOrder,
  });

  const { data: statsData } = usePrStats();
  const stats = (statsData as unknown as { data?: { total: number; byStatus: Record<string, { count: number; totalAmount: number }> } })?.data;
  const byStatus = stats?.byStatus ?? {};
  const totalPrs = stats?.total ?? 0;
  const draftCount = byStatus[PrStatus.DRAFT]?.count ?? 0;
  const inReviewCount = (byStatus[PrStatus.LEVEL1_REVIEW]?.count ?? 0)
    + (byStatus[PrStatus.LEVEL2_REVIEW]?.count ?? 0)
    + (byStatus[PrStatus.LEVEL3_REVIEW]?.count ?? 0);

  const prs = data?.data ?? [];
  const meta = data?.meta;
  const canCreate = user?.role !== UserRole.ADMIN;


  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: '0s' }}>
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
            Purchase Requests
          </h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">
            Create, track, and manage purchase requests.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Header metadata pills */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
              {totalPrs} Total
            </span>
            {draftCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-500 tabular-nums">
                {draftCount} Draft
              </span>
            )}
            {inReviewCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-600 tabular-nums">
                {inReviewCount} In Review
              </span>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/purchase-requests/new')}
              className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{
                background: 'linear-gradient(155deg, #262626 0%, #0d0d0d 100%)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18), 0 14px 36px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.10)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,0.07)';
              }}
            >
              <Plus className="h-4 w-4" />
              New PR
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Filters Bar ─────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        style={{ animationDelay: '0.06s' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search — primary control, takes available space */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors duration-200 peer-focus:text-zinc-600" />
            <input
              type="text"
              placeholder="Search by PR number or item summary..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="peer w-full h-10 rounded-lg border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
            />
          </div>
          {/* Filters — secondary, grouped tighter */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); setSearchParams({}, { replace: true }); }}>
              <SelectTrigger className="w-full sm:w-[154px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={`${PrStatus.LEVEL1_REVIEW},${PrStatus.LEVEL2_REVIEW},${PrStatus.LEVEL3_REVIEW}`}>In Review (All Levels)</SelectItem>
                <SelectItem value={`${PrStatus.PENDING_QUOTATION},${PrStatus.QUOTED}`}>In Procurement</SelectItem>
                {PR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PR_STATUS_LABELS[s as PrStatusType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[134px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PR_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PR_PRIORITY_LABELS[p as PrPriorityType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[134px] h-10 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase_request">Purchase Request</SelectItem>
                <SelectItem value="job_request">Job Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Table Container ──────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden"
        style={{ animationDelay: '0.1s' }}
      >
        {isLoading ? (
          <div className="space-y-1 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        ) : prs.length === 0 ? (
          /* ── Empty State ──────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 mb-5">
              <FileText className="h-7 w-7 text-zinc-400" />
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">No purchase requests</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm mb-6">
              {canCreate
                ? 'Get started by creating your first purchase request.'
                : 'No purchase requests to display.'}
            </p>
            {canCreate && (
              <button
                onClick={() => navigate('/purchase-requests/new')}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-zinc-800 hover:shadow-md"
              >
                <Plus className="h-4 w-4" /> Create Purchase Request
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Table ────────────────────────────────────────── */}
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      PR Number
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Request
                    </th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      <span
                        onClick={() => toggleSort('totalAmount')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortBy === 'totalAmount' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Amount
                        {sortBy === 'totalAmount'
                          ? (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Priority
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Status
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      <span
                        onClick={() => toggleSort('createdAt')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortBy === 'createdAt' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Date
                        {sortBy === 'createdAt'
                          ? (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr, idx) => (
                      <tr
                        key={pr._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                      >
                        {/* PR Number */}
                        <td className="px-5 py-4">
                          {pr.prNumber ? (
                            <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight">
                              {pr.prNumber}
                            </span>
                          ) : (
                            <span className="text-[13px] italic text-zinc-400">Draft</span>
                          )}
                        </td>

                        {/* Request title + description */}
                        <td className="px-5 py-4">
                          <div className="max-w-[320px]">
                            <p className="text-[13px] font-medium text-zinc-800 leading-snug truncate group-hover:text-zinc-950 transition-colors duration-150">
                              {pr.title}
                            </p>
                            {pr.description && (
                              <p className="text-[12px] text-zinc-400 truncate mt-0.5">{pr.description}</p>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          {hasPendingQuote(pr) ? (
                            <span className="text-[13px] font-semibold text-amber-600">TBD</span>
                          ) : (
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-800">
                              {formatCurrency(pr.totalAmount)}
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-[11px] font-medium leading-none transition-opacity duration-150 ${priorityStyle[pr.priority] ?? 'bg-zinc-50 text-zinc-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[pr.priority] ?? 'bg-zinc-300'}`} />
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium leading-none transition-opacity duration-150 ${statusStyle[pr.status] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[pr.status] ?? 'bg-zinc-400'}`} />
                            {PR_STATUS_LABELS[pr.status as PrStatusType]}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4">
                          <span className="text-[13px] tabular-nums text-zinc-400">
                            {new Date(pr.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </td>

                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────────── */}
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

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
