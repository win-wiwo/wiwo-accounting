import { useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  PrStatus,
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  SourcingType,
  type PrPriority as PrPriorityType,
  type PrStatus as PrStatusType,
  type PurchaseRequest,
} from '@prams/shared';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

/* ── Badge styling (matches other pages) ──────────────── */
const priorityStyle: Record<string, string> = {
  low:    'bg-zinc-100 text-zinc-500',
  medium: 'bg-blue-50 text-blue-600',
  high:   'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-600',
};

const procStatusStyle: Record<string, string> = {
  pending_quotation: 'bg-violet-50 text-violet-700',
  quoted:            'bg-emerald-50 text-emerald-700',
  returned_for_info: 'bg-amber-50 text-amber-700',
};

const PROC_STATUSES = [
  PrStatus.PENDING_QUOTATION,
  PrStatus.QUOTED,
  PrStatus.RETURNED_FOR_INFO,
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function relativeAge(dateStr: string | null | undefined): { label: string; days: number } {
  if (!dateStr) return { label: '\u2014', days: 0 };
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: 'Today', days: 0 };
  if (days === 1) return { label: '1 day ago', days: 1 };
  return { label: `${days} days ago`, days };
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function ProcurementQueuePage() {
  usePageTitle('Procurement');
  const navigate = useNavigate();

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const { data, isLoading } = usePurchaseRequests({
    page,
    limit,
    status: PROC_STATUSES.join(','),
  });

  const [sortCol, setSortCol] = useState<'default' | 'amount' | 'age'>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function toggleSort(col: 'amount' | 'age') {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const rawPrs = (data?.data ?? []) as PurchaseRequest[];
  const meta = data?.meta;

  const prs = useMemo(() => {
    return [...rawPrs].sort((a, b) => {
      if (sortCol === 'amount') {
        return sortDir === 'asc'
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount;
      }
      if (sortCol === 'age') {
        const aTime = new Date(a.submittedAt ?? 0).getTime();
        const bTime = new Date(b.submittedAt ?? 0).getTime();
        return sortDir === 'asc' ? bTime - aTime : aTime - bTime;
      }
      // default: quoted first, then priority, then oldest
      const aQuoted = a.status === PrStatus.QUOTED ? 0 : 1;
      const bQuoted = b.status === PrStatus.QUOTED ? 0 : 1;
      if (aQuoted !== bQuoted) return aQuoted - bQuoted;
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (pDiff !== 0) return pDiff;
      return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
    });
  }, [rawPrs, sortCol, sortDir]);

  // Stats
  const totalPending = meta?.total ?? rawPrs.length;
  const highCount = rawPrs.filter((pr) => pr.priority === 'high' || pr.priority === 'urgent').length;
  const oldestDays = rawPrs.reduce((max, pr) => {
    const { days } = relativeAge(pr.submittedAt);
    return days > max ? days : max;
  }, 0);

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: '0s' }}>
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
            Procurement Queue
          </h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">
            Purchase requests pending quotation and supplier pricing.
          </p>
        </div>
        {!isLoading && rawPrs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
              {totalPending} Pending
            </span>
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700 tabular-nums">
                {highCount} High Priority
              </span>
            )}
            {oldestDays >= 5 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium tabular-nums ${oldestDays >= 10 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                {oldestDays}d oldest
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Table Container ──────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden"
        style={{ animationDelay: '0.06s' }}
      >
        {isLoading ? (
          <div className="space-y-1 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 mb-5">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">All requests are processed</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm">
              No purchase requests currently need quotations or pricing updates.
            </p>
          </div>
        ) : (
          <>
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
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Requester
                    </th>
                    <th className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      <span
                        onClick={() => toggleSort('amount')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortCol === 'amount' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Amount
                        {sortCol === 'amount'
                          ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Status
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Priority
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      <span
                        onClick={() => toggleSort('age')}
                        className={`inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150 ${sortCol === 'age' ? 'text-zinc-700' : 'hover:text-zinc-600'}`}
                      >
                        Age
                        {sortCol === 'age'
                          ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 opacity-70" /> : <ArrowDown className="h-3 w-3 opacity-70" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="h-11 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr, idx) => {
                    const requester = pr.requesterId && typeof pr.requesterId === 'object'
                      ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                      : null;
                    const dept = pr.departmentId && typeof pr.departmentId === 'object'
                      ? (pr.departmentId as unknown as { name: string })
                      : null;
                    const hasProcurement = pr.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT);
                    const isRevised = !!pr.previousSubmissionSnapshot;
                    const isReturnedForInfo = pr.status === PrStatus.RETURNED_FOR_INFO;
                    const { label: ageLabel, days: ageDays } = relativeAge(pr.submittedAt);
                    const amountIsUnknown = hasProcurement && pr.totalAmount === 0;

                    return (
                      <tr
                        key={pr._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/procurement/${pr._id}`)}
                      >
                        {/* PR Number */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight">
                            {pr.prNumber}
                          </span>
                        </td>

                        {/* Request */}
                        <td className="px-5 py-4">
                          <div className="max-w-[320px]">
                            <p className="text-[13px] font-medium text-zinc-800 leading-snug truncate group-hover:text-zinc-950 transition-colors duration-150">
                              {pr.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {dept && (
                                <span className="text-[11px] text-zinc-400">{dept.name}</span>
                              )}
                              {hasProcurement && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-0.5">
                                  <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                </span>
                              )}
                              {isRevised && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-1.5 py-0.5">
                                  <RotateCcw className="h-2.5 w-2.5" /> Revised
                                </span>
                              )}
                              {isReturnedForInfo && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-1.5 py-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Needs Info
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requester */}
                        <td className="px-5 py-4">
                          <span className="text-[13px] text-zinc-500">
                            {requester ? `${requester.firstName} ${requester.lastName}` : '\u2014'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          {amountIsUnknown ? (
                            <span className="text-[13px] italic text-amber-600">Pending Quote</span>
                          ) : (
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-800">
                              {formatCurrency(pr.totalAmount)}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${procStatusStyle[pr.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {PR_STATUS_LABELS[pr.status as PrStatusType]}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityStyle[pr.priority] ?? 'bg-zinc-100 text-zinc-500'}`}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </span>
                        </td>

                        {/* Age */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            {ageDays >= 5 && (
                              <Clock className={`h-3 w-3 shrink-0 ${ageDays >= 10 ? 'text-red-500' : 'text-zinc-400'}`} />
                            )}
                            <span className={`text-[13px] tabular-nums whitespace-nowrap ${
                              ageDays >= 10
                                ? 'text-red-600 font-semibold'
                                : ageDays >= 7
                                  ? 'text-red-500 font-medium'
                                  : 'text-zinc-400'
                            }`}>
                              {ageLabel}
                            </span>
                          </div>
                        </td>

                        {/* Chevron */}
                        <td className="px-3 py-4">
                          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="text-[11px] font-medium text-zinc-400 hidden lg:inline">Review</span>
                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
