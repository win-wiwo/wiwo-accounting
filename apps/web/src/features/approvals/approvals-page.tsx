import { useState, useMemo, useEffect } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
  PrStatus,
  SourcingType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePendingApprovals } from '@/hooks/use-approvals';
import { useAuthStore } from '@/stores/auth.store';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PrApprovalModal } from './pr-approval-modal';

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

function daysPast(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/* ── Priority badge styling (matches PR list) ────────── */
const priorityStyle: Record<string, string> = {
  low:    'bg-tone-neutral-bg text-tone-neutral-text',
  medium: 'bg-tone-info-bg text-tone-info-text',
  high:   'bg-tone-warning-bg text-tone-warning-text',
  urgent: 'bg-tone-danger-bg text-tone-danger-text',
};

export function ApprovalsPage() {
  usePageTitle('Approvals');
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = usePendingApprovals({ page, limit });

  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const [sortCol, setSortCol] = useState<'priority' | 'amount' | 'age'>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'approval' | 'price_review'>('all');

  const isCoo = user?.role === 'coo';

  function toggleSort(col: 'amount' | 'age') {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const rawPrs = data?.data ?? [];
  const meta = data?.meta;

  const prs = useMemo(() => {
    const filtered = typeFilter === 'all'
      ? rawPrs
      : typeFilter === 'price_review'
        ? rawPrs.filter((pr) => pr.status === PrStatus.QUOTED)
        : rawPrs.filter((pr) => pr.status !== PrStatus.QUOTED);

    return [...filtered].sort((a, b) => {
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
      // default: priority first, then oldest
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (pDiff !== 0) return pDiff;
      return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
    });
  }, [rawPrs, sortCol, sortDir, typeFilter]);

  // Counts for COO type tabs
  const approvalCount = rawPrs.filter((pr) => pr.status !== PrStatus.QUOTED).length;
  const priceReviewCount = rawPrs.filter((pr) => pr.status === PrStatus.QUOTED).length;

  // Auto-open modal when navigated from a notification with ?pr=<id>
  useEffect(() => {
    const prId = searchParams.get('pr');
    if (!prId || isLoading || prs.length === 0) return;
    const idx = prs.findIndex((pr) => pr._id === prId);
    if (idx !== -1) {
      setActiveIndex(idx);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, prs, isLoading, setSearchParams]);

  const prIds = prs.map((pr) => pr._id);

  // Queue intelligence stats
  const totalPending = meta?.total ?? prs.length;
  const urgentCount = prs.filter((pr) => pr.priority === 'urgent').length;
  const oldestDays = prs.reduce((max, pr) => {
    const { days } = relativeAge(pr.submittedAt);
    return days > max ? days : max;
  }, 0);

  const levelLabel = user?.role
    ? APPROVAL_LEVEL_LABELS[
        user.role === 'dept_head' ? 1 : user.role === 'coo' ? 2 : user.role === 'ceo' ? 3 : 0
      ] ?? ''
    : '';

  const openModal = (index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: '0s' }}>
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
            Approval Queue
          </h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">
            {levelLabel ? `Pending your review as ${levelLabel}` : 'PRs awaiting your approval'}
          </p>
        </div>
        {/* Header metadata pills */}
        {!isLoading && prs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
              {totalPending} Pending
            </span>
            {urgentCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-danger-bg px-3 py-1 text-[12px] font-medium text-tone-danger-text tabular-nums">
                {urgentCount} Urgent
              </span>
            )}
            {oldestDays >= 5 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium tabular-nums ${oldestDays >= 10 ? 'bg-tone-danger-bg text-tone-danger-text' : 'bg-tone-warning-bg text-tone-warning-text'}`}>
                {oldestDays}d oldest
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── COO Type Tabs ─────────────────────────────────────── */}
      {isCoo && !isLoading && rawPrs.length > 0 && (
        <div className="pr-list-section flex items-center gap-1 rounded-lg bg-zinc-100/60 p-1 w-fit" style={{ animationDelay: '0.03s' }}>
          {([
            { key: 'all' as const, label: 'All', count: rawPrs.length },
            { key: 'approval' as const, label: 'Approval', count: approvalCount },
            { key: 'price_review' as const, label: 'Price Review', count: priceReviewCount },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                typeFilter === tab.key
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
              <span className={`tabular-nums text-[11px] rounded-full px-1.5 py-px ${
                typeFilter === tab.key
                  ? 'bg-zinc-100 text-zinc-600'
                  : 'bg-zinc-200/60 text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Table Container ──────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white shadow-card-hover overflow-hidden"
        style={{ animationDelay: '0.06s' }}
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 mb-5">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">All caught up</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm">
              You have no pending approvals right now.
            </p>
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
                    {isCoo && (
                      <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                        Type
                      </th>
                    )}
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
                    const overdueDays = daysPast(pr.neededByDate ?? undefined);
                    const isOverdue = overdueDays > 0;
                    const { label: ageLabel, days: ageDays } = relativeAge(pr.submittedAt);
                    const amountIsUnknown = hasProcurement && pr.totalAmount === 0;

                    return (
                      <tr
                        key={pr._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => openModal(idx)}
                      >
                        {/* PR Number */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight">
                            {pr.prNumber}
                          </span>
                        </td>

                        {/* Type (COO only) */}
                        {isCoo && (
                          <td className="px-5 py-4">
                            {pr.status === PrStatus.QUOTED ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-tone-success-text bg-tone-success-bg border border-tone-success-border rounded-full px-2 py-0.5">
                                Price Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-tone-info-text bg-tone-info-bg border border-tone-info-border rounded-full px-2 py-0.5">
                                Approval
                              </span>
                            )}
                          </td>
                        )}

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
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-tone-info-text bg-tone-info-bg border border-tone-info-border rounded-full px-1.5 py-0.5">
                                  <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                </span>
                              )}
                              {isRevised && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-tone-warning-text bg-tone-warning-bg border border-tone-warning-border rounded-full px-1.5 py-0.5">
                                  <RotateCcw className="h-2.5 w-2.5" /> Revised
                                </span>
                              )}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-tone-danger-text bg-tone-danger-bg border border-tone-danger-border rounded-full px-1.5 py-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Need Date Passed
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

                        {/* Priority */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityStyle[pr.priority] ?? 'bg-tone-neutral-bg text-tone-neutral-text'}`}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </span>
                        </td>

                        {/* Age */}
                        <td className="px-5 py-4">
                          <span className={`text-[13px] tabular-nums whitespace-nowrap ${
                            ageDays >= 10
                              ? 'text-red-600 font-semibold'
                              : ageDays >= 7
                                ? 'text-red-500 font-medium'
                                : 'text-zinc-400'
                          }`}>
                            {ageLabel}
                          </span>
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
                      <SelectTrigger className="w-auto h-8 px-2.5 rounded-lg border-zinc-200 bg-zinc-50/40 text-[13px] text-zinc-600 focus:border-zinc-400 focus:shadow-focus">
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
                              ? 'bg-zinc-900 text-white shadow-xs'
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

      <PrApprovalModal
        prIds={prIds}
        currentIndex={activeIndex}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onNavigate={setActiveIndex}
      />
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
