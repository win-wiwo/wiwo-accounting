import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, XCircle, ArrowRight,
  ShoppingCart, Plus, AlertTriangle, ChevronRight, RotateCcw, Activity,
} from 'lucide-react';
import {
  PR_STATUS_LABELS, PR_PRIORITY_LABELS,
  PrStatus, UserRole, SourcingType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usePrStats, usePurchaseRequests, useProjectSpending, useManagementStats } from '@/hooks/use-purchase-requests';
import { usePendingApprovals, usePendingCount } from '@/hooks/use-approvals';
import { usePoMonthlyStats } from '@/hooks/use-purchase-orders';
import { useNotifications } from '@/hooks/use-notifications';
import type { ProjectSpendingItem } from '@/lib/api-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const APPROVER_ROLES = [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO];
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const STATUS_HEALTH = [
  { key: PrStatus.LEVEL1_REVIEW,       label: 'Dept Head Review',    dot: 'bg-blue-400' },
  { key: PrStatus.LEVEL2_REVIEW,       label: 'COO Review',          dot: 'bg-blue-500' },
  { key: PrStatus.LEVEL3_REVIEW,       label: 'CEO Review',          dot: 'bg-indigo-500' },
  { key: PrStatus.PENDING_QUOTATION,   label: 'Pending Procurement', dot: 'bg-violet-400' },
  { key: PrStatus.QUOTED,              label: 'Price Review',        dot: 'bg-violet-600' },
  { key: PrStatus.RETURNED,            label: 'Returned',            dot: 'bg-amber-400' },
  { key: PrStatus.REJECTED,            label: 'Rejected',            dot: 'bg-red-400' },
  { key: PrStatus.DRAFT,               label: 'Draft',               dot: 'bg-zinc-300' },
  { key: PrStatus.APPROVED,            label: 'Approved',            dot: 'bg-emerald-400' },
];

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-amber-400',
  medium: 'bg-blue-400',
  low:    'bg-zinc-300',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ageLabel(d: string | null | undefined) {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function ageDays(d: string | null | undefined) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function compact(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function full(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isApprover = user ? APPROVER_ROLES.includes(user.role as typeof APPROVER_ROLES[number]) : false;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [queueFilter, setQueueFilter] = useState<'all' | 'urgent' | 'procurement'>('all');

  const isManagement = user?.role === UserRole.COO || user?.role === UserRole.CEO || user?.role === UserRole.ADMIN;

  const { data: statsData, isLoading: statsLoading } = usePrStats();
  const { data: projectSpending, isLoading: projectSpendingLoading } = useProjectSpending();
  const { data: mgmtStats, isLoading: mgmtLoading } = useManagementStats();
  const { data: posIssuedThisMonth } = usePoMonthlyStats();
  const { data: pendingCountData } = usePendingCount();
  const { data: notifData } = useNotifications({ page: 1, limit: 6 });
  const recentNotifs = ((notifData as unknown as { data?: { _id: string; message: string; isRead: boolean; createdAt: string; purchaseRequestId: string | null }[] })?.data ?? []).slice(0, 5);
  const { data: pendingPrsData, isLoading: queueLoading } = usePendingApprovals({ page: 1, limit: 10 });
  const { data: myPrsData, isLoading: myPrsLoading } = usePurchaseRequests(
    { limit: 5 },
    { enabled: !isApprover && !isAdmin },
  );

  const rawPendingPrs = isApprover ? (pendingPrsData?.data ?? []) : [];

  const pendingCountFromApi = (pendingCountData as unknown as { count?: number })?.count ?? 0;
  const pendingCountFromList = pendingPrsData?.meta?.total ?? rawPendingPrs.length;
  const pendingCount = Math.max(pendingCountFromApi, pendingCountFromList);
  const myPrs = (!isApprover && !isAdmin) ? (myPrsData?.data ?? []) : [];

  const sortedPending = useMemo(() =>
    [...rawPendingPrs].sort((a, b) => {
      const pd = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      return pd !== 0 ? pd : new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
    }), [rawPendingPrs]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'urgent') return sortedPending.filter(p => p.priority === 'urgent');
    if (queueFilter === 'procurement') return sortedPending.filter(p =>
      p.items.some(i => i.sourcingType === SourcingType.PROCUREMENT));
    return sortedPending;
  }, [sortedPending, queueFilter]);

  const heroItem = sortedPending[0] ?? null;

  const stats = (statsData as unknown as { data?: { total: number; byStatus: Record<string, { count: number; totalAmount: number }> } })?.data;
  const byStatus = stats?.byStatus ?? {};
  const totalPrs = stats?.total ?? 0;

  const approvedCount   = byStatus[PrStatus.APPROVED]?.count ?? 0;
  const rejectedCount   = byStatus[PrStatus.REJECTED]?.count ?? 0;
  const returnedCount   = byStatus[PrStatus.RETURNED]?.count ?? 0;
  const draftCount      = byStatus[PrStatus.DRAFT]?.count ?? 0;
  const inReviewCount   = (byStatus[PrStatus.LEVEL1_REVIEW]?.count ?? 0) +
                          (byStatus[PrStatus.LEVEL2_REVIEW]?.count ?? 0) +
                          (byStatus[PrStatus.LEVEL3_REVIEW]?.count ?? 0);
  const inProcCount     = (byStatus[PrStatus.PENDING_QUOTATION]?.count ?? 0) +
                          (byStatus[PrStatus.QUOTED]?.count ?? 0);

  const pendingTotalValue = [
    PrStatus.LEVEL1_REVIEW, PrStatus.LEVEL2_REVIEW, PrStatus.LEVEL3_REVIEW,
    PrStatus.PENDING_QUOTATION, PrStatus.QUOTED,
  ].reduce((sum, s) => sum + (byStatus[s]?.totalAmount ?? 0), 0);

  const urgentCount = sortedPending.filter(p => p.priority === 'urgent').length;
  const oldestAge   = sortedPending.reduce((max, p) => Math.max(max, ageDays(p.submittedAt)), 0);

  const subtitle = isApprover
    ? pendingCount > 0
      ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} your approval.`
      : "You're all caught up. No pending approvals."
    : totalPrs === 0
      ? "No purchase requests yet. Create your first one."
      : `${totalPrs} total request${totalPrs > 1 ? 's' : ''} in the system.`;

  return (
    <div className="space-y-7 max-w-screen-2xl">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="dash-section greeting-glow rounded-2xl pb-1 -mx-2 px-2 py-1" style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
              {greeting()}, {user?.firstName}.
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">{subtitle}</p>
          </div>
          <p className="text-[12px] text-zinc-400 shrink-0 pb-0.5 tabular-nums">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Hero Action Card ──────────────────────────────────── */}
      {isApprover && (
        <div className="dash-section" style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}>
          {statsLoading || queueLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : heroItem ? (
            (() => {
              const requester = heroItem.requesterId && typeof heroItem.requesterId === 'object'
                ? (heroItem.requesterId as unknown as { firstName: string; lastName: string })
                : null;
              const isUrgent = heroItem.priority === 'urgent';
              return (
                <div
                  className="rounded-xl border border-zinc-200 bg-white px-6 py-5 flex items-center justify-between gap-4 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5"
                  onClick={() => navigate('/approvals')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.07em] ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
                        {pendingCount} request{pendingCount > 1 ? 's' : ''} awaiting your review
                      </span>
                    </div>
                    <p className="font-semibold text-[15px] text-zinc-900 leading-snug truncate">{heroItem.title}</p>
                    <p className="text-[13px] text-zinc-400 mt-1">
                      {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                      {' · '}
                      {PR_PRIORITY_LABELS[heroItem.priority as PrPriorityType]}
                      {' · '}
                      {ageLabel(heroItem.submittedAt)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-zinc-800 hover:shadow-md"
                    onClick={(e) => { e.stopPropagation(); navigate('/approvals'); }}
                  >
                    Review <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-[14px] text-zinc-900">You're all caught up</p>
                <p className="text-[13px] text-zinc-500 mt-0.5">No purchase requests are waiting for your approval.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="dash-section" style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.10s both' }}>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {isApprover ? (
              <>
                <KpiCard label="Pending Approval" value={pendingCount} onClick={() => navigate('/approvals')}
                  variant={pendingCount > 0 ? 'warning' : 'default'} />
                {urgentCount > 0 && (
                  <KpiCard label="Urgent" value={urgentCount} onClick={() => navigate('/approvals')} variant="danger" />
                )}
                {pendingTotalValue > 0 && (
                  <KpiCard label="Value Pending" value={compact(pendingTotalValue)} />
                )}
                {oldestAge > 0 && (
                  <KpiCard label="Oldest Pending" value={`${oldestAge}d`}
                    variant={oldestAge >= 7 ? 'danger' : 'default'} />
                )}
                <KpiCard label="Total PRs" value={totalPrs} onClick={() => navigate('/purchase-requests')} />
              </>
            ) : !isAdmin ? (
              <>
                <KpiCard label="My Requests" value={totalPrs} onClick={() => navigate('/purchase-requests')} />
                {inReviewCount > 0 && (
                  <KpiCard label="In Review" value={inReviewCount} onClick={() => navigate('/purchase-requests')} variant="warning" />
                )}
                {inProcCount > 0 && (
                  <KpiCard label="In Procurement" value={inProcCount} onClick={() => navigate('/purchase-requests')} />
                )}
                <KpiCard label="Approved" value={approvedCount} onClick={() => navigate('/purchase-requests')} variant="success" />
                {returnedCount > 0 && (
                  <KpiCard label="Returned" value={returnedCount} onClick={() => navigate('/purchase-requests')} variant="warning" />
                )}
              </>
            ) : (
              <>
                <KpiCard label="Total PRs" value={totalPrs} />
                <KpiCard label="In Review" value={inReviewCount} variant={inReviewCount > 0 ? 'warning' : 'default'} />
                <KpiCard label="Approved" value={approvedCount} variant="success" />
                <KpiCard label="Rejected" value={rejectedCount} variant={rejectedCount > 0 ? 'danger' : 'default'} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Management Stats Row ─────────────────────────────── */}
      {(isManagement || isApprover) && (
        <div className="dash-section" style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.14s both' }}>
          {mgmtLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : mgmtStats ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Avg Approval Time"
                value={mgmtStats.avgApprovalDays !== null ? `${mgmtStats.avgApprovalDays}d` : '—'}
                sub="per request"
                variant={mgmtStats.avgApprovalDays !== null && mgmtStats.avgApprovalDays > 5 ? 'warning' : 'default'}
              />
              {isManagement && (
                <StatCard
                  label="Approved This Month"
                  value={compact(mgmtStats.thisMonthApprovedSpend)}
                  sub={`${mgmtStats.thisMonthRequestCount} request${mgmtStats.thisMonthRequestCount !== 1 ? 's' : ''} submitted`}
                />
              )}
              <StatCard
                label="Overdue"
                value={String(mgmtStats.overdueCount)}
                sub="pending > 5 days"
                variant={mgmtStats.overdueCount > 0 ? 'danger' : 'default'}
                onClick={isApprover ? () => navigate('/approvals') : undefined}
              />
              {isManagement && (
                <StatCard
                  label="POs Issued"
                  value={String(posIssuedThisMonth ?? 0)}
                  sub="this month"
                  onClick={() => navigate('/purchase-orders')}
                />
              )}
              {!isManagement && isApprover && (
                <StatCard
                  label="Rejection Rate"
                  value={`${mgmtStats.rejectionRate}%`}
                  sub="of all decisions"
                  variant={mgmtStats.rejectionRate > 15 ? 'warning' : 'default'}
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div
        className="dash-section grid gap-5 lg:grid-cols-12"
        style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}
      >

        {/* Left — primary content */}
        <div className="lg:col-span-8 space-y-5">

          {/* Pending Queue (approvers) */}
          {isApprover && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                <CardTitle className="text-[15px] font-semibold text-zinc-900">Approval Queue</CardTitle>
                <button
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors duration-150"
                  onClick={() => navigate('/approvals')}
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </CardHeader>

              {/* Filter tabs */}
              <div className="px-6 pb-4 flex gap-1">
                {(['all', 'urgent', 'procurement'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 active:scale-[0.96] ${
                      queueFilter === f
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'urgent' ? 'Urgent' : 'Procurement'}
                  </button>
                ))}
              </div>

              <CardContent className="pt-0 px-6">
                {queueLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="h-7 w-7 text-zinc-200 mx-auto mb-2.5" />
                    <p className="text-[13px] text-zinc-400">
                      {queueFilter === 'all' ? 'No pending approvals.' : `No ${queueFilter} items.`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredQueue.slice(0, 5).map(pr => {
                      const requester = pr.requesterId && typeof pr.requesterId === 'object'
                        ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                        : null;
                      const hasProcurement = pr.items.some(i => i.sourcingType === SourcingType.PROCUREMENT);
                      const amountUnknown = hasProcurement && pr.totalAmount === 0;
                      const days = ageDays(pr.submittedAt);
                      return (
                        <div
                          key={pr._id}
                          className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
                          onClick={() => navigate('/approvals')}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[pr.priority] ?? 'bg-zinc-300'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[13px] text-zinc-800 leading-snug line-clamp-1">{pr.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[12px] text-zinc-400">
                                {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                              </span>
                              {hasProcurement && (
                                <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">
                                  Procurement
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[13px] font-semibold shrink-0 tabular-nums ${amountUnknown ? 'text-amber-500 text-[11px] font-normal italic' : 'text-zinc-700'}`}>
                            {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
                          </span>
                          <span className={`text-[12px] shrink-0 w-14 text-right tabular-nums ${days >= 7 ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                            {ageLabel(pr.submittedAt)}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-zinc-400 shrink-0 transition-colors duration-150" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* My Recent PRs (staff) */}
          {!isApprover && !isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                <CardTitle className="text-[15px] font-semibold text-zinc-900">My Recent Requests</CardTitle>
                <button
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors duration-150"
                  onClick={() => navigate('/purchase-requests')}
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent className="pt-0 px-6">
                {myPrsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : myPrs.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="h-7 w-7 text-zinc-200 mx-auto mb-2.5" />
                    <p className="text-[13px] text-zinc-400 mb-4">No purchase requests yet.</p>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-zinc-800"
                      onClick={() => navigate('/purchase-requests/new')}
                    >
                      <Plus className="h-3.5 w-3.5" /> Create your first PR
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {myPrs.map(pr => {
                      const hasProcurement = pr.items.some(i => i.sourcingType === SourcingType.PROCUREMENT);
                      const amountUnknown = hasProcurement && pr.totalAmount === 0;
                      return (
                        <div
                          key={pr._id}
                          className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
                          onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[pr.priority] ?? 'bg-zinc-300'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[13px] text-zinc-800 leading-snug line-clamp-1">{pr.title}</p>
                            <p className="text-[12px] text-zinc-400 mt-0.5">
                              {PR_STATUS_LABELS[pr.status as PrStatusType] ?? pr.status}
                              {' · '}
                              {ageLabel(pr.submittedAt ?? pr.createdAt)}
                            </p>
                          </div>
                          <span className={`text-[13px] font-semibold shrink-0 tabular-nums ${amountUnknown ? 'text-amber-500 text-[11px] font-normal italic' : 'text-zinc-700'}`}>
                            {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-zinc-400 shrink-0 transition-colors duration-150" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dept Spend (management only) */}
          {isManagement && mgmtStats && mgmtStats.spendByDepartment.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                <CardTitle className="text-[15px] font-semibold text-zinc-900">Spend by Department</CardTitle>
                <span className="text-[11px] text-zinc-400">Approved only</span>
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-6">
                {mgmtLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const maxAmt = Math.max(...mgmtStats.spendByDepartment.map(d => d.totalAmount), 1);
                      return mgmtStats.spendByDepartment.map((dept, idx) => (
                        <div key={String(dept.departmentId)} className="group rounded-lg py-2 -mx-2 px-2 hover:bg-zinc-50 transition-colors duration-150">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] font-medium text-zinc-700 truncate pr-3">{dept.departmentName}</span>
                            <div className="text-right shrink-0">
                              <span className="text-[13px] font-semibold tabular-nums text-zinc-900">{compact(dept.totalAmount)}</span>
                              <span className="text-[11px] text-zinc-400 ml-2">{dept.count} PR{dept.count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="dept-bar-enter h-full rounded-full bg-zinc-800"
                              style={{ width: `${Math.round((dept.totalAmount / maxAmt) * 100)}%`, animationDelay: `${0.18 + idx * 0.09}s` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right — operational context */}
        <div className="lg:col-span-4 space-y-4">

          {/* Status Health */}
          <Card>
            <CardHeader className="pb-4 px-6 pt-5">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-6 pb-5">
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : totalPrs === 0 ? (
                <p className="text-[13px] text-zinc-400 py-1">No requests in the system yet.</p>
              ) : (
                <div className="space-y-3">
                  {STATUS_HEALTH.map(({ key, label, dot }) => {
                    const count = byStatus[key]?.count ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                          <span className="text-[13px] text-zinc-500">{label}</span>
                        </div>
                        <span className="text-[13px] font-semibold tabular-nums text-zinc-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {!isAdmin && (
            <Card>
              <CardHeader className="pb-4 px-6 pt-5">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-5 space-y-0.5">
                {!isApprover && (
                  <button
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors duration-150"
                    onClick={() => navigate('/purchase-requests/new')}
                  >
                    <Plus className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    New Purchase Request
                  </button>
                )}
                {isApprover && (
                  <button
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors duration-150"
                    onClick={() => navigate('/approvals')}
                  >
                    <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    Approval Queue
                    {pendingCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[10px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors duration-150"
                  onClick={() => navigate('/purchase-requests')}
                >
                  <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  All Purchase Requests
                </button>
              </CardContent>
            </Card>
          )}

          {/* Project Spending */}
          {(projectSpendingLoading || (projectSpending && projectSpending.length > 0)) && (
            <Card>
              <CardHeader className="pb-4 px-6 pt-5">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Project Spending
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-5">
                {projectSpendingLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(projectSpending ?? []).map((p: ProjectSpendingItem) => {
                      const pct = p.totalAmount > 0 ? Math.round((p.approvedAmount / p.totalAmount) * 100) : 0;
                      return (
                        <div key={String(p.projectId)}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="text-[13px] font-medium text-zinc-800 truncate">{p.projectName}</p>
                              {p.projectCode && (
                                <p className="text-[11px] text-zinc-400 font-mono">{p.projectCode}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[13px] font-semibold tabular-nums text-zinc-900">{compact(p.approvedAmount)}</p>
                              {p.pendingAmount > 0 && (
                                <p className="text-[11px] tabular-nums text-amber-600">+{compact(p.pendingAmount)} pending</p>
                              )}
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {(pendingTotalValue > 0 || returnedCount > 0 || rejectedCount > 0 || draftCount > 0 || oldestAge > 0) && (
            <Card>
              <CardHeader className="pb-4 px-6 pt-5">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-5 space-y-3">
                {pendingTotalValue > 0 && (
                  <InsightRow icon={<ShoppingCart className="h-3.5 w-3.5" />}
                    text={`${full(pendingTotalValue)} awaiting approval`} />
                )}
                {oldestAge >= 5 && (
                  <InsightRow icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    text={`Oldest pending request: ${oldestAge} days`} urgent />
                )}
                {returnedCount > 0 && (
                  <InsightRow icon={<RotateCcw className="h-3.5 w-3.5" />}
                    text={`${returnedCount} request${returnedCount > 1 ? 's' : ''} returned for revision`} />
                )}
                {draftCount > 0 && !isApprover && (
                  <InsightRow icon={<FileText className="h-3.5 w-3.5" />}
                    text={`${draftCount} draft${draftCount > 1 ? 's' : ''} not yet submitted`} />
                )}
                {rejectedCount > 0 && (
                  <InsightRow icon={<XCircle className="h-3.5 w-3.5" />}
                    text={`${rejectedCount} request${rejectedCount > 1 ? 's' : ''} rejected`} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {recentNotifs.length > 0 && (
            <Card>
              <CardHeader className="pb-3 px-6 pt-5 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Recent Activity
                </CardTitle>
                <Activity className="h-3 w-3 text-zinc-300" />
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-5 space-y-3.5">
                {recentNotifs.map((n) => (
                  <div
                    key={n._id}
                    className={`flex items-start gap-2.5 group/activity ${n.purchaseRequestId ? 'cursor-pointer' : ''}`}
                    onClick={() => n.purchaseRequestId && navigate(`/purchase-requests/${n.purchaseRequestId}`)}
                  >
                    <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-150 ${n.isRead ? 'bg-zinc-200' : 'bg-zinc-500'}`} />
                    <div className="min-w-0">
                      <p className="text-[12px] leading-snug text-zinc-600 group-hover/activity:text-zinc-800 transition-colors duration-150 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, variant = 'default', onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'warning' | 'danger';
  onClick?: () => void;
}) {
  const valueStyles = {
    default: 'text-zinc-900',
    warning: 'text-amber-700',
    danger:  'text-red-600',
  };
  const dotStyles = {
    default: 'bg-zinc-300',
    warning: 'bg-amber-400',
    danger:  'bg-red-400',
  };
  return (
    <div
      className={`rounded-xl border border-zinc-100 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
        onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:border-zinc-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
        <span className={`h-2 w-2 rounded-full ${dotStyles[variant]}`} />
      </div>
      <p className={`kpi-value text-[28px] font-bold tabular-nums leading-none ${valueStyles[variant]}`}>{value}</p>
      {sub && <p className="mt-2 text-[11px] text-zinc-400 leading-snug">{sub}</p>}
    </div>
  );
}

function KpiCard({
  label, value, variant = 'default', onClick,
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}) {
  const dotStyles = {
    default: 'bg-zinc-300',
    warning: 'bg-amber-400',
    danger:  'bg-red-400',
    success: 'bg-emerald-400',
  };
  const valueStyles = {
    default: 'text-zinc-900',
    warning: 'text-amber-700',
    danger:  'text-red-600',
    success: 'text-emerald-700',
  };
  return (
    <div
      className={`rounded-xl border border-zinc-100 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
        onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:border-zinc-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
        <span className={`h-2 w-2 rounded-full ${dotStyles[variant]}`} />
      </div>
      <p className={`kpi-value text-[32px] font-bold tabular-nums leading-none ${valueStyles[variant]}`}>{value}</p>
    </div>
  );
}

function InsightRow({ icon, text, urgent }: { icon: React.ReactNode; text: string; urgent?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 text-[13px] leading-snug ${urgent ? 'text-red-500' : 'text-zinc-500'}`}>
      <span className={`shrink-0 mt-0.5 ${urgent ? 'text-red-400' : 'text-zinc-400'}`}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
