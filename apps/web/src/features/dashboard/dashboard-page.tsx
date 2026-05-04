import { useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, ArrowRight,
  Plus, ChevronRight,
  Package,
} from 'lucide-react';
import {
  PR_STATUS_LABELS, PR_PRIORITY_LABELS,
  PrStatus, UserRole, SourcingType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usePrStats, usePurchaseRequests, useManagementStats, useProjectHealth } from '@/hooks/use-purchase-requests';
import { usePendingApprovals, usePendingCount } from '@/hooks/use-approvals';
import { usePoStats, usePurchaseOrders } from '@/hooks/use-purchase-orders';
import type { ProjectHealthItem } from '@/lib/api-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const APPROVER_ROLES = [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO];
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const OVERDUE_DAYS = 5;

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-amber-400',
  medium: 'bg-zinc-400',
  low:    'bg-zinc-300',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ageLabel(d: string | null | undefined) {
  if (!d) return '--';
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

function requesterName(pr: any): string {
  const r = pr.requesterId && typeof pr.requesterId === 'object'
    ? pr.requesterId as { firstName: string; lastName: string }
    : null;
  return r ? `${r.firstName} ${r.lastName}` : '--';
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const role = user?.role as string;
  const isApprover = user ? APPROVER_ROLES.includes(role as typeof APPROVER_ROLES[number]) : false;
  const isAdmin = role === UserRole.ADMIN;
  const isProcurement = role === UserRole.PROCUREMENT;
  const isCoo = role === UserRole.COO;
  const isCeo = role === UserRole.CEO;
  const isAccounting = role === UserRole.ACCOUNTING;
  const isStaff = role === UserRole.STAFF || isAccounting;
  const isDeptHead = role === UserRole.DEPT_HEAD;
  const isManagement = isCoo || isCeo || isAdmin;

  const [queueFilter, setQueueFilter] = useState<'all' | 'approval' | 'price_review'>('all');

  // Data hooks
  const { data: statsData, isLoading: statsLoading } = usePrStats();
const { data: mgmtStats, isLoading: mgmtLoading } = useManagementStats({ enabled: isManagement || isAccounting });
  const { data: projectHealthData, isLoading: projectHealthLoading } = useProjectHealth();
  const { data: pendingCountData } = usePendingCount();
  const { data: pendingPrsData, isLoading: queueLoading } = usePendingApprovals({ page: 1, limit: 50 });

  const { data: myPrsData, isLoading: myPrsLoading } = usePurchaseRequests(
    { limit: 20 },
    { enabled: isStaff || isDeptHead },
  );
  const { data: returnedPrsData } = usePurchaseRequests(
    { limit: 10, status: PrStatus.RETURNED },
    { enabled: isStaff || isDeptHead },
  );
  const { data: procQueueData, isLoading: procQueueLoading } = usePurchaseRequests(
    { limit: 20, status: PrStatus.PENDING_QUOTATION },
    { enabled: isProcurement },
  );
  const { data: poStatsData, isLoading: poStatsLoading } = usePoStats();
  const { data: recentPosData, isLoading: recentPosLoading } = usePurchaseOrders(
    { limit: 10, sort: 'createdAt', order: 'desc' },
    // Procurement sees POs; management sees POs for oversight
  );
  const { data: orderedPosData } = usePurchaseOrders(
    { limit: 20, status: 'ordered', sort: 'createdAt', order: 'asc' },
    // For overdue PO detection
  );

  // Derived data
  const stats = (statsData as unknown as { data?: { total: number; byStatus: Record<string, { count: number; totalAmount: number }> } })?.data;
  const byStatus = stats?.byStatus ?? {};
  const totalPrs = stats?.total ?? 0;

  const pendingCountFromApi = (pendingCountData as unknown as { count?: number })?.count ?? 0;
  const rawPendingPrs = isApprover ? (pendingPrsData?.data ?? []) : [];
  const pendingCountFromList = pendingPrsData?.meta?.total ?? rawPendingPrs.length;
  const pendingCount = Math.max(pendingCountFromApi, pendingCountFromList);

  const sortedPending = useMemo(() =>
    [...rawPendingPrs].sort((a, b) => {
      const pd = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      return pd !== 0 ? pd : new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
    }), [rawPendingPrs]);

  const myPrs = (isStaff || isDeptHead) ? (myPrsData?.data ?? []) : [];
  const returnedPrs = (isStaff || isDeptHead) ? (returnedPrsData?.data ?? []) : [];
  const procQueue = isProcurement ? (procQueueData?.data ?? []) : [];
  const poStats = (poStatsData as unknown as { data?: { total: number; pending: number; ordered: number; received: number; cancelled: number; activeValue: number } })?.data;
  const recentPos = recentPosData?.data ?? [];
  const orderedPos = orderedPosData?.data ?? [];

  // Project health
  const projectHealth = projectHealthData;
  const projectSummary = projectHealth?.summary;
  const projects = projectHealth?.projects ?? [];
  const hasProjects = projects.length > 0;

  // Computed metrics
  const approvedCount   = byStatus[PrStatus.APPROVED]?.count ?? 0;
  const rejectedCount   = byStatus[PrStatus.REJECTED]?.count ?? 0;
  const returnedCount   = byStatus[PrStatus.RETURNED]?.count ?? 0;
  const inReviewCount   = (byStatus[PrStatus.LEVEL1_REVIEW]?.count ?? 0) +
                          (byStatus[PrStatus.LEVEL2_REVIEW]?.count ?? 0) +
                          (byStatus[PrStatus.LEVEL3_REVIEW]?.count ?? 0);
  const inProcCount     = (byStatus[PrStatus.PENDING_QUOTATION]?.count ?? 0) +
                          (byStatus[PrStatus.QUOTED]?.count ?? 0);
  const procPendingCount = byStatus[PrStatus.PENDING_QUOTATION]?.count ?? 0;
  const quotedCount     = byStatus[PrStatus.QUOTED]?.count ?? 0;

  // Approver urgency signals
  const overdueApprovals = sortedPending.filter(p => ageDays(p.submittedAt) >= OVERDUE_DAYS);
  const urgentApprovals = sortedPending.filter(p => p.priority === 'urgent');
  const highValuePending = sortedPending.filter(p => p.totalAmount >= 50_000);
  const oldestAge = sortedPending.reduce((max, p) => Math.max(max, ageDays(p.submittedAt)), 0);

  // PO urgency (procurement): ordered POs with no arrival date or past arrival date
  const overduePOs = useMemo(() =>
    orderedPos.filter((po: any) => {
      if (!po.estimatedArrivalDate) return ageDays(po.orderedAt ?? po.createdAt) >= 7;
      return new Date(po.estimatedArrivalDate) < new Date();
    }), [orderedPos]);

  // COO queue split
  const approvalQueue = useMemo(() =>
    sortedPending.filter(p => p.status !== PrStatus.QUOTED), [sortedPending]);
  const priceReviewQueue = useMemo(() =>
    sortedPending.filter(p => p.status === PrStatus.QUOTED), [sortedPending]);
  const filteredQueue = useMemo(() => {
    if (queueFilter === 'approval') return approvalQueue;
    if (queueFilter === 'price_review') return priceReviewQueue;
    return sortedPending;
  }, [sortedPending, approvalQueue, priceReviewQueue, queueFilter]);

  // Subtitle
  const subtitle = isApprover
    ? pendingCount > 0
      ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} your attention.`
      : "You're all caught up. No pending approvals."
    : isProcurement
      ? procPendingCount > 0 || (poStats?.pending ?? 0) > 0
        ? `${procPendingCount} canvass + ${poStats?.pending ?? 0} POs pending action.`
        : "Pipeline clear. No items need attention."
    : isAdmin
      ? `${totalPrs} total requests. ${inReviewCount} in review.`
    : totalPrs === 0
      ? "No purchase requests yet. Create your first one."
      : returnedCount > 0
        ? `${returnedCount} returned request${returnedCount > 1 ? 's' : ''} need${returnedCount === 1 ? 's' : ''} your attention.`
        : `${totalPrs} total request${totalPrs > 1 ? 's' : ''}.`;

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* Greeting */}
      <div className="dash-section greeting-glow rounded-2xl pb-1 -mx-2 px-2 py-1" style={{ animation: 'dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5">
          <div>
            <h1 className="text-display font-bold tracking-[-0.01em] leading-tight text-zinc-900">
              {greeting()}, {user?.firstName}.
            </h1>
            <p className="mt-2 text-body-lg leading-relaxed text-zinc-500">{subtitle}</p>
          </div>
          <p className="text-caption text-zinc-400/80 shrink-0 pb-0.5 tabular-nums">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  STAFF / DEPT_HEAD (as requester) DASHBOARD                      */}
      {/* ================================================================ */}
      {(isStaff || (isDeptHead && !pendingCount)) && (
        <>
          {/* Urgent: Returned PRs */}
          <AnimSection delay={0.06}>
            {returnedPrs.length > 0 ? (
              <UrgentPanel
                title="Needs Your Attention"
                items={returnedPrs.map(pr => ({
                  id: pr._id,
                  title: pr.title,
                  reason: 'Returned — revision needed',
                  age: ageLabel(pr.updatedAt ?? pr.submittedAt),
                  severity: 'danger' as const,
                  onClick: () => navigate(`/purchase-requests/${pr._id}`),
                }))}
                action={{ label: 'View All Returned', onClick: () => navigate('/purchase-requests?status=returned') }}
              />
            ) : myPrs.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shadow-card">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-body-lg text-zinc-900">All clear</p>
                  <p className="text-body text-zinc-500 mt-0.5">No requests need your attention right now.</p>
                </div>
              </div>
            ) : null}
          </AnimSection>

          {/* KPIs */}
          <AnimSection delay={0.10}>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {returnedCount > 0 && (
                  <KpiCard label="Returned" value={returnedCount} onClick={() => navigate('/purchase-requests?status=returned')} variant="danger" />
                )}
                <KpiCard label="My Requests" value={totalPrs} onClick={() => navigate('/purchase-requests')} />
                {inReviewCount > 0 && (
                  <KpiCard label="In Review" value={inReviewCount} onClick={() => navigate('/purchase-requests?status=level1_review,level2_review,level3_review')} variant="warning" />
                )}
                {inProcCount > 0 && (
                  <KpiCard label="In Procurement" value={inProcCount} onClick={() => navigate('/purchase-requests?status=pending_quotation,quoted')} />
                )}
                <KpiCard label="Approved" value={approvedCount} onClick={() => navigate('/purchase-requests?status=approved')} variant="success" />
              </div>
            )}
          </AnimSection>

          {/* My Recent + Quick Actions + Accounting Spending */}
          <AnimSection delay={0.20}>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                    <CardTitle className="text-body-lg font-semibold text-zinc-900">My Recent Requests</CardTitle>
                    <NavLink label="View all" onClick={() => navigate('/purchase-requests')} />
                  </CardHeader>
                  <CardContent className="pt-0 px-6">
                    {myPrsLoading ? (
                      <QueueSkeleton />
                    ) : myPrs.length === 0 ? (
                      <EmptyQueue
                        icon={<FileText className="h-7 w-7 text-zinc-200" />}
                        message="No purchase requests yet."
                        action={{ label: 'Create your first PR', onClick: () => navigate('/purchase-requests/new') }}
                      />
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {myPrs.slice(0, 5).map(pr => (
                          <PrRow key={pr._id} pr={pr} onClick={() => navigate(`/purchase-requests/${pr._id}`)} showStatus />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Accounting: Overall Spending + Spend by Department */}
                {isAccounting && hasProjects && (
                  <ProjectOverviewPanel
                    summary={projectSummary!}
                    projects={projects}
                    loading={projectHealthLoading}
                    onProjectClick={(id) => navigate(`/purchase-requests?projectId=${id ?? 'none'}`)}
                  />
                )}

                {isAccounting && mgmtStats && mgmtStats.spendByDepartment.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                      <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Spend by Department</CardTitle>
                      <span className="text-caption text-zinc-400">Approved only</span>
                    </CardHeader>
                    <CardContent className="pt-0 px-6 pb-6">
                      {mgmtLoading ? (
                        <QueueSkeleton count={4} height="h-8" />
                      ) : (
                        <DeptSpendBars departments={mgmtStats.spendByDepartment} />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="lg:col-span-4 space-y-4">
                <QuickActionsCard actions={[
                  { icon: <Plus className="h-3.5 w-3.5" />, label: 'New Purchase Request', onClick: () => navigate('/purchase-requests/new') },
                  { icon: <FileText className="h-3.5 w-3.5" />, label: 'All Purchase Requests', onClick: () => navigate('/purchase-requests') },
                ]} />
                <SystemStatusCard byStatus={byStatus} totalPrs={totalPrs} loading={statsLoading} />
              </div>
            </div>
          </AnimSection>
        </>
      )}

      {/* ================================================================ */}
      {/*  APPROVER DASHBOARD (Dept Head, COO, CEO)                        */}
      {/* ================================================================ */}
      {isApprover && (isDeptHead ? pendingCount > 0 : true) && (
        <>
          {/* Urgent Action Panel */}
          <AnimSection delay={0.06}>
            {statsLoading || queueLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : sortedPending.length > 0 ? (
              <UrgentPanel
                title="Needs Your Review"
                items={[
                  ...overdueApprovals.slice(0, 2).map(pr => ({
                    id: pr._id,
                    title: pr.title,
                    reason: `Overdue ${ageDays(pr.submittedAt)}d`,
                    age: ageLabel(pr.submittedAt),
                    severity: 'danger' as const,
                    onClick: () => navigate('/approvals'),
                  })),
                  ...urgentApprovals.filter(p => !overdueApprovals.includes(p)).slice(0, 1).map(pr => ({
                    id: pr._id,
                    title: pr.title,
                    reason: 'Urgent priority',
                    age: ageLabel(pr.submittedAt),
                    severity: 'danger' as const,
                    onClick: () => navigate('/approvals'),
                  })),
                  ...highValuePending.filter(p => !overdueApprovals.includes(p) && p.priority !== 'urgent').slice(0, 1).map(pr => ({
                    id: pr._id,
                    title: pr.title,
                    reason: `High value ${compact(pr.totalAmount)}`,
                    age: ageLabel(pr.submittedAt),
                    severity: 'warning' as const,
                    onClick: () => navigate('/approvals'),
                  })),
                ].slice(0, 3)}
                action={{ label: 'Open Approval Queue', onClick: () => navigate('/approvals') }}
                summary={`${pendingCount} pending approval${overdueApprovals.length > 0 ? ` (${overdueApprovals.length} overdue)` : ''}`}
              />
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shadow-card">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-body-lg text-zinc-900">You're all caught up</p>
                  <p className="text-body text-zinc-500 mt-0.5">No purchase requests are waiting for your approval.</p>
                </div>
              </div>
            )}
          </AnimSection>

          {/* KPI Cards */}
          <AnimSection delay={0.10}>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard label="Pending Approval" value={pendingCount} onClick={() => navigate('/approvals')}
                  variant={overdueApprovals.length > 0 ? 'danger' : pendingCount > 0 ? 'warning' : 'default'} />
                {isCoo && quotedCount > 0 && (
                  <KpiCard label="Price Review" value={quotedCount} variant="warning" onClick={() => navigate('/approvals')} />
                )}
                {oldestAge > 0 && (
                  <KpiCard label="Oldest Pending" value={`${oldestAge}d`} variant={oldestAge >= 7 ? 'danger' : 'default'} />
                )}
                <KpiCard label="Total PRs" value={totalPrs} onClick={() => navigate('/purchase-requests')} />
              </div>
            )}
          </AnimSection>

          {/* Main Grid: Queue + Context */}
          <AnimSection delay={0.14}>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-5">
                {/* Approval Queue */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                    <CardTitle className="text-body-lg font-semibold text-zinc-900">Approval Queue</CardTitle>
                    <NavLink label="View all" onClick={() => navigate('/approvals')} />
                  </CardHeader>

                  {/* COO filter tabs */}
                  {isCoo && (
                    <div className="px-6 pb-4 flex gap-1">
                      {([
                        { key: 'all' as const, label: 'All', count: sortedPending.length },
                        { key: 'approval' as const, label: 'Approval', count: approvalQueue.length },
                        { key: 'price_review' as const, label: 'Price Review', count: priceReviewQueue.length },
                      ]).map(f => (
                        <button
                          key={f.key}
                          onClick={() => setQueueFilter(f.key)}
                          className={`px-3 py-1 rounded-full text-caption font-semibold tracking-wide transition-all duration-200 active:scale-[0.96] ${
                            queueFilter === f.key
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {f.label}{f.count > 0 ? ` (${f.count})` : ''}
                        </button>
                      ))}
                    </div>
                  )}

                  <CardContent className="pt-0 px-6">
                    {queueLoading ? (
                      <QueueSkeleton />
                    ) : filteredQueue.length === 0 ? (
                      <EmptyQueue
                        icon={<CheckCircle2 className="h-7 w-7 text-zinc-200" />}
                        message={queueFilter === 'price_review' ? 'No price review items.' : 'No pending approvals.'}
                      />
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {filteredQueue.slice(0, 7).map(pr => {
                          const hasProcurement = pr.items.some((i: any) => i.sourcingType === SourcingType.PROCUREMENT);
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
                                <p className="font-medium text-body text-zinc-800 leading-snug line-clamp-1">{pr.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-label text-zinc-400">{requesterName(pr)}</span>
                                  {pr.status === PrStatus.QUOTED && (
                                    <span className="text-micro font-medium text-tone-info-text bg-tone-info-bg rounded-full px-2 py-0.5">Price Review</span>
                                  )}
                                  {hasProcurement && pr.status !== PrStatus.QUOTED && (
                                    <span className="text-micro font-medium text-tone-info-text bg-tone-info-bg rounded-full px-2 py-0.5">Procurement</span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-body font-semibold shrink-0 tabular-nums ${amountUnknown ? 'text-amber-500 text-caption font-normal italic' : 'text-zinc-700'}`}>
                                {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
                              </span>
                              <span className={`text-label shrink-0 w-14 text-right tabular-nums ${days >= 15 ? 'text-red-500 font-medium' : days >= 8 ? 'text-amber-500 font-medium' : 'text-zinc-400'}`}>
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

                {/* Project Spending */}
                {hasProjects && (
                  <ProjectOverviewPanel
                    summary={projectSummary!}
                    projects={projects}
                    loading={projectHealthLoading}
                    onProjectClick={(id) => navigate(`/purchase-requests?projectId=${id ?? 'none'}`)}
                  />
                )}

                {/* Dept Spend (management) */}
                {isManagement && mgmtStats && mgmtStats.spendByDepartment.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                      <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Spend by Department</CardTitle>
                      <span className="text-caption text-zinc-400">Approved only</span>
                    </CardHeader>
                    <CardContent className="pt-0 px-6 pb-6">
                      {mgmtLoading ? (
                        <QueueSkeleton count={4} height="h-8" />
                      ) : (
                        <DeptSpendBars departments={mgmtStats.spendByDepartment} />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right sidebar */}
              <div className="lg:col-span-4 space-y-4">
                {/* Quick Actions */}
                <QuickActionsCard actions={[
                  { icon: <Clock className="h-3.5 w-3.5" />, label: 'Approval Queue', onClick: () => navigate('/approvals'), badge: pendingCount > 0 ? pendingCount : undefined },
                  { icon: <FileText className="h-3.5 w-3.5" />, label: 'All Purchase Requests', onClick: () => navigate('/purchase-requests') },
                ]} />

                <SystemStatusCard byStatus={byStatus} totalPrs={totalPrs} loading={statsLoading} />
              </div>
            </div>
          </AnimSection>
        </>
      )}

      {/* ================================================================ */}
      {/*  PROCUREMENT DASHBOARD                                           */}
      {/* ================================================================ */}
      {isProcurement && (
        <>
          {/* Urgent: Overdue POs + high-priority canvass */}
          <AnimSection delay={0.06}>
            {(() => {
              const pendingPoCount = poStats?.pending ?? 0;
              const staleCanvass = procQueue.filter(p => ageDays(p.submittedAt) >= OVERDUE_DAYS);
              const urgentCanvass = procQueue.filter(p => p.priority === 'urgent');

              const urgentItems: UrgentItem[] = [];

              // Overdue ordered POs (delivery past due)
              overduePOs.slice(0, 2).forEach((po: any) => urgentItems.push({
                id: po._id,
                title: `${po.poNumber ?? 'PO'} — ${po.supplierName || 'Online'}`,
                reason: po.estimatedArrivalDate
                  ? `Delivery overdue ${ageDays(po.estimatedArrivalDate)}d`
                  : `Ordered ${ageDays(po.orderedAt ?? po.createdAt)}d ago, no ETA`,
                age: ageLabel(po.orderedAt ?? po.createdAt),
                severity: 'danger',
                onClick: () => navigate(`/purchase-orders/${po._id}`),
              }));

              // POs not yet ordered — bulk signal
              if (pendingPoCount > 0) {
                urgentItems.push({
                  id: 'pending-pos',
                  title: `${pendingPoCount} Purchase Order${pendingPoCount > 1 ? 's' : ''} not yet ordered`,
                  reason: 'Needs ordering',
                  age: '',
                  severity: pendingPoCount >= 5 ? 'danger' : 'warning',
                  onClick: () => navigate('/purchase-orders?status=pending'),
                });
              }

              // Stale canvass items (>5 days old)
              if (staleCanvass.length > 0) {
                urgentItems.push({
                  id: 'stale-canvass',
                  title: `${staleCanvass.length} canvass item${staleCanvass.length > 1 ? 's' : ''} aging ${ageDays(staleCanvass[0].submittedAt)}+ days`,
                  reason: 'Stale',
                  age: '',
                  severity: 'warning',
                  onClick: () => navigate('/procurement'),
                });
              }

              // Urgent-priority canvass
              urgentCanvass.filter(p => ageDays(p.submittedAt) < OVERDUE_DAYS).slice(0, 1).forEach(pr => urgentItems.push({
                id: pr._id,
                title: pr.title,
                reason: 'Urgent priority',
                age: ageLabel(pr.submittedAt),
                severity: 'danger',
                onClick: () => navigate(`/procurement/${pr._id}`),
              }));

              if (urgentItems.length === 0) return (
                <div className="rounded-xl border border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shadow-card">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-body-lg text-zinc-900">Pipeline on track</p>
                    <p className="text-body text-zinc-500 mt-0.5">No overdue POs or urgent canvass items.</p>
                  </div>
                </div>
              );
              return (
                <UrgentPanel
                  title="Needs Your Attention"
                  items={urgentItems.slice(0, 4)}
                  action={{ label: 'View Purchase Orders', onClick: () => navigate('/purchase-orders') }}
                />
              );
            })()}
          </AnimSection>

          {/* KPIs */}
          <AnimSection delay={0.10}>
            {statsLoading || poStatsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                <KpiCard label="Pending Canvass" value={procPendingCount} onClick={() => navigate('/procurement')} />
                {quotedCount > 0 && (
                  <KpiCard label="Awaiting Price Review" value={quotedCount} onClick={() => navigate('/purchase-requests?status=quoted')} />
                )}
                <KpiCard label="Pending POs" value={poStats?.pending ?? 0} onClick={() => navigate('/purchase-orders?status=pending')} variant={(poStats?.pending ?? 0) > 0 ? 'warning' : 'default'} />
                <KpiCard label="Ordered" value={poStats?.ordered ?? 0} onClick={() => navigate('/purchase-orders?status=ordered')} />
                {overduePOs.length > 0 && (
                  <KpiCard label="Overdue Delivery" value={overduePOs.length} variant="danger" onClick={() => navigate('/purchase-orders?status=ordered')} />
                )}
                <KpiCard label="Received" value={poStats?.received ?? 0} onClick={() => navigate('/purchase-orders?status=received')} variant="success" />
              </div>
            )}
          </AnimSection>

          {/* Main Grid: Canvass Queue + POs */}
          <AnimSection delay={0.14}>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-5">
                {/* Pending Canvass */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                    <CardTitle className="text-body-lg font-semibold text-zinc-900">Canvass Queue</CardTitle>
                    <NavLink label="View all" onClick={() => navigate('/procurement')} />
                  </CardHeader>
                  <CardContent className="pt-0 px-6">
                    {procQueueLoading ? (
                      <QueueSkeleton />
                    ) : procQueue.length === 0 ? (
                      <EmptyQueue
                        icon={<CheckCircle2 className="h-7 w-7 text-zinc-200" />}
                        message="No items pending canvass."
                      />
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {procQueue.slice(0, 7).map(pr => {
                          const itemCount = pr.items.filter((i: any) => i.sourcingType === SourcingType.PROCUREMENT).length;
                          const days = ageDays(pr.submittedAt);
                          return (
                            <div
                              key={pr._id}
                              className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
                              onClick={() => navigate(`/procurement/${pr._id}`)}
                            >
                              <span className="h-[3px] w-[3px] rounded-full shrink-0 bg-zinc-300" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-body text-zinc-800 leading-snug line-clamp-1">{pr.title}</p>
                                <p className="text-label text-zinc-400 mt-0.5">
                                  {requesterName(pr)} · {itemCount} item{itemCount !== 1 ? 's' : ''} to source
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1.5 text-label font-semibold shrink-0">
                                <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[pr.priority] ?? 'bg-zinc-300'}`} />
                                <span className={pr.priority === 'urgent' ? 'text-red-600' : pr.priority === 'high' ? 'text-amber-600' : 'text-zinc-500'}>
                                  {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                                </span>
                              </span>
                              <span className={`text-label shrink-0 w-14 text-right tabular-nums ${days >= 15 ? 'text-red-500 font-medium' : days >= 8 ? 'text-amber-500 font-medium' : 'text-zinc-400'}`}>
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

                {/* Recent POs */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                    <CardTitle className="text-body-lg font-semibold text-zinc-900">Recent Purchase Orders</CardTitle>
                    <NavLink label="View all" onClick={() => navigate('/purchase-orders')} />
                  </CardHeader>
                  <CardContent className="pt-0 px-6">
                    {recentPosLoading ? (
                      <QueueSkeleton />
                    ) : recentPos.length === 0 ? (
                      <EmptyQueue
                        icon={<FileText className="h-7 w-7 text-zinc-200" />}
                        message="No purchase orders yet."
                      />
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {recentPos.slice(0, 5).map((po: any) => (
                          <PoRow key={po._id} po={po} onClick={() => navigate(`/purchase-orders/${po._id}`)} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Project Spending */}
                {hasProjects && (
                  <ProjectOverviewPanel
                    summary={projectSummary!}
                    projects={projects}
                    loading={projectHealthLoading}
                    onProjectClick={(id) => navigate(`/purchase-requests?projectId=${id ?? 'none'}`)}
                  />
                )}
              </div>

              {/* Right sidebar */}
              <div className="lg:col-span-4 space-y-4">
                {/* PO Pipeline */}
                {poStats && (
                  <Card>
                    <CardHeader className="pb-4 px-6 pt-5">
                      <CardTitle className="text-micro font-semibold uppercase tracking-[0.1em] text-zinc-400">PO Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-6 pb-5 space-y-3">
                      <PipelineRow label="Pending" count={poStats.pending} color="bg-amber-400/50" total={poStats.total} />
                      <PipelineRow label="Ordered" count={poStats.ordered} color="bg-blue-400/50" total={poStats.total} />
                      <PipelineRow label="Received" count={poStats.received} color="bg-emerald-400/70" total={poStats.total} />
                      {poStats.cancelled > 0 && (
                        <PipelineRow label="Cancelled" count={poStats.cancelled} color="bg-zinc-300" total={poStats.total} />
                      )}
                    </CardContent>
                  </Card>
                )}

                <QuickActionsCard actions={[
                  { icon: <Clock className="h-3.5 w-3.5" />, label: 'Procurement Queue', onClick: () => navigate('/procurement'), badge: procPendingCount > 0 ? procPendingCount : undefined },
                  { icon: <Package className="h-3.5 w-3.5" />, label: 'Purchase Orders', onClick: () => navigate('/purchase-orders'), badge: (poStats?.pending ?? 0) > 0 ? poStats?.pending : undefined },
                ]} />
              </div>
            </div>
          </AnimSection>
        </>
      )}

      {/* ================================================================ */}
      {/*  ADMIN DASHBOARD                                                 */}
      {/* ================================================================ */}
      {isAdmin && (
        <>
          {/* KPIs — system health focus */}
          <AnimSection delay={0.06}>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard label="Total PRs" value={totalPrs} onClick={() => navigate('/purchase-requests')} />
                <KpiCard label="In Review" value={inReviewCount} variant={inReviewCount > 0 ? 'warning' : 'default'} />
                <KpiCard label="In Procurement" value={inProcCount} variant={inProcCount > 0 ? 'warning' : 'default'} />
                <KpiCard label="Approved" value={approvedCount} variant="success" />
                {rejectedCount > 0 && (
                  <KpiCard label="Rejected" value={rejectedCount} variant="danger" />
                )}
              </div>
            )}
          </AnimSection>

          {/* Spend */}
          <AnimSection delay={0.18}>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-5">
                {/* Project Spending */}
                {hasProjects && (
                  <ProjectOverviewPanel
                    summary={projectSummary!}
                    projects={projects}
                    loading={projectHealthLoading}
                    onProjectClick={(id) => navigate(`/purchase-requests?projectId=${id ?? 'none'}`)}
                  />
                )}

                {/* Dept Spend */}
                {mgmtStats && mgmtStats.spendByDepartment.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                      <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Spend by Department</CardTitle>
                      <span className="text-caption text-zinc-400">Approved only</span>
                    </CardHeader>
                    <CardContent className="pt-0 px-6 pb-6">
                      <DeptSpendBars departments={mgmtStats.spendByDepartment} />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                <SystemStatusCard byStatus={byStatus} totalPrs={totalPrs} loading={statsLoading} />

              </div>
            </div>
          </AnimSection>
        </>
      )}

      {/* ================================================================ */}
      {/*  PROJECT SPENDING (non-admin, non-staff sidebar supplement)       */}
      {/* ================================================================ */}
      {/* Already included inline above for each role */}
    </div>
  );
}


// ─── Shared Sub-Components ──────────────────────────────────────────────

function AnimSection({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div className="dash-section" style={{ animation: `dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both` }}>
      {children}
    </div>
  );
}

// ─── Project Overview Panel ─────────────────────────────────────────────

const HEALTH_CONFIG = {
  on_track: { label: 'On Track',  dot: 'bg-emerald-400', text: 'text-tone-success-text', bg: 'bg-tone-success-bg' },
  at_risk:  { label: 'At Risk',   dot: 'bg-amber-400',   text: 'text-tone-warning-text',   bg: 'bg-tone-warning-bg' },
  delayed:  { label: 'Delayed',   dot: 'bg-amber-400',   text: 'text-tone-warning-text',   bg: 'bg-tone-warning-bg' },
  blocked:  { label: 'Blocked',   dot: 'bg-red-500',     text: 'text-tone-danger-text',     bg: 'bg-tone-danger-bg' },
} as const;

function ProjectOverviewPanel({ summary, projects, loading, onProjectClick }: {
  summary: { total: number; onTrack: number; atRisk: number; delayed: number; blocked: number };
  projects: ProjectHealthItem[];
  loading: boolean;
  onProjectClick?: (projectId: string | null) => void;
}) {
  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!summary || summary.total === 0) return null;

  const maxSpend = Math.max(...projects.map(p => p.totalAmount), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Spending</CardTitle>
        <span className="text-caption text-zinc-400">{summary.total} categor{summary.total !== 1 ? 'ies' : 'y'}</span>
      </CardHeader>

      <CardContent className="pt-0 px-6 pb-5">
        <div className="divide-y divide-zinc-100">
          {projects.slice(0, 10).map(proj => {
            const h = HEALTH_CONFIG[proj.health];
            const approvedPct = proj.totalAmount > 0 ? (proj.approvedAmount / proj.totalAmount) * 100 : 0;
            const pendingPct = proj.totalAmount > 0 ? (proj.pendingAmount / proj.totalAmount) * 100 : 0;
            const barWidth = Math.round((proj.totalAmount / maxSpend) * 100);

            return (
              <div key={proj.projectId ?? '_general'} className="group py-3 first:pt-0 last:pb-0 -mx-2 px-2 hover:bg-zinc-50 rounded-lg transition-colors duration-150 cursor-pointer" onClick={() => onProjectClick?.(proj.projectId)}>
                {/* Header row: name + health + spend */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                    <span className="text-body font-medium text-zinc-700 truncate">{proj.projectName}</span>
                    {proj.projectCode && <span className="text-micro text-zinc-500 font-mono shrink-0 bg-zinc-100 rounded-full px-2 py-0.5">{proj.projectCode}</span>}
                    {proj.health !== 'on_track' && (
                      <span className={`inline-flex items-center gap-1 text-micro font-medium rounded-full px-2 py-0.5 shrink-0 ${h.bg} ${h.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />
                        {h.label}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-body font-semibold tabular-nums text-zinc-900">{compact(proj.approvedAmount)}</span>
                    {proj.pendingAmount > 0 && (
                      <span className={`text-caption tabular-nums ml-1.5 ${
                        proj.health === 'blocked' ? 'text-red-600' : proj.health === 'delayed' || proj.health === 'at_risk' ? 'text-amber-600' : 'text-zinc-400'
                      }`}>+{compact(proj.pendingAmount)}</span>
                    )}
                    <span className="text-caption text-zinc-400 ml-2">{proj.totalPrs} PR{proj.totalPrs !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Spend bar: approved (green) + pending (amber) */}
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden" style={{ width: `${Math.max(barWidth, 12)}%` }}>
                  <div className="h-full flex">
                    {approvedPct > 0 && (
                      <div
                        className="h-full bg-emerald-400/70 transition-all duration-500"
                        style={{ width: `${approvedPct}%` }}
                      />
                    )}
                    {pendingPct > 0 && (
                      <div
                        className="h-full bg-amber-400/50 transition-all duration-500"
                        style={{ width: `${pendingPct}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Issue callout for troubled projects */}
                {proj.health !== 'on_track' && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {proj.overdueCount > 0 && (
                      <span className="text-micro text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 hover:bg-zinc-100 transition-colors cursor-pointer">{proj.overdueCount} overdue</span>
                    )}
                    {proj.returnedCount > 0 && (
                      <span className="text-micro text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 hover:bg-zinc-100 transition-colors cursor-pointer">{proj.returnedCount} returned</span>
                    )}
                    {proj.inProcurementCount > 0 && (
                      <span className="text-micro text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 hover:bg-zinc-100 transition-colors cursor-pointer">{proj.inProcurementCount} in procurement</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Urgent Panel ───────────────────────────────────────────────────────

interface UrgentItem {
  id: string;
  title: string;
  reason: string;
  age: string;
  severity: 'danger' | 'warning';
  onClick: () => void;
}

function UrgentPanel({ title, items, action, summary }: {
  title: string;
  items: UrgentItem[];
  action?: { label: string; onClick: () => void };
  summary?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
        <div className="flex items-center gap-2">
          <CardTitle className="text-body-lg font-semibold text-zinc-900">{title}</CardTitle>
          {summary && <span className="text-label text-zinc-400">{summary}</span>}
        </div>
        {action && (
          <NavLink label={action.label} onClick={action.onClick} />
        )}
      </CardHeader>
      <CardContent className="pt-0 px-6">
        <div className="divide-y divide-zinc-100">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
              onClick={item.onClick}
            >
              <span className={`h-[5px] w-[5px] rounded-full shrink-0 ${item.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-zinc-800 truncate">{item.title}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-label font-medium shrink-0 ${
                item.severity === 'danger' ? 'text-red-600' : 'text-amber-600'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${item.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400'}`} />
                {item.reason}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-zinc-400 shrink-0 transition-colors duration-150" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Risk Panel ─────────────────────────────────────────────────────────

// ─── System Status ──────────────────────────────────────────────────────

const STATUS_HEALTH = [
  { key: PrStatus.LEVEL1_REVIEW,       label: 'Dept Head Review',    dot: 'bg-blue-400' },
  { key: PrStatus.LEVEL2_REVIEW,       label: 'COO Review',          dot: 'bg-blue-500' },
  { key: PrStatus.LEVEL3_REVIEW,       label: 'CEO Review',          dot: 'bg-indigo-500' },
  { key: PrStatus.PENDING_QUOTATION,   label: 'Pending Canvass',     dot: 'bg-violet-400' },
  { key: PrStatus.QUOTED,              label: 'Price Review',        dot: 'bg-violet-600' },
  { key: PrStatus.RETURNED,            label: 'Returned',            dot: 'bg-amber-400' },
  { key: PrStatus.REJECTED,            label: 'Rejected',            dot: 'bg-red-400' },
  { key: PrStatus.DRAFT,               label: 'Draft',               dot: 'bg-zinc-300' },
  { key: PrStatus.APPROVED,            label: 'Approved',            dot: 'bg-emerald-400' },
];

function SystemStatusCard({ byStatus, totalPrs, loading }: {
  byStatus: Record<string, { count: number; totalAmount: number }>;
  totalPrs: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-4 px-6 pt-5">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">System Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-5">
        {loading ? (
          <QueueSkeleton count={5} height="h-5" />
        ) : totalPrs === 0 ? (
          <p className="text-body text-zinc-400 py-1">No requests in the system yet.</p>
        ) : (
          <div className="space-y-3">
            {STATUS_HEALTH.map(({ key, label, dot }) => {
              const count = byStatus[key]?.count ?? 0;
              if (count === 0) return null;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-body text-zinc-500">{label}</span>
                  </div>
                  <span className="text-body font-semibold tabular-nums text-zinc-900">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Actions ──────────────────────────────────────────────────────

function QuickActionsCard({ actions }: {
  actions: Array<{ icon: React.ReactNode; label: string; onClick: () => void; badge?: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-4 px-6 pt-5">
        <CardTitle className="text-micro font-semibold uppercase tracking-[0.1em] text-zinc-400">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-5 space-y-0.5">
        {actions.map((a, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-medium text-zinc-700 hover:bg-zinc-50 transition-colors duration-150"
            onClick={a.onClick}
          >
            <span className="text-zinc-400 shrink-0">{a.icon}</span>
            {a.label}
            {a.badge != null && a.badge > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-micro font-bold text-white">
                {a.badge}
              </span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Dept Spend Bars ────────────────────────────────────────────────────

function DeptSpendBars({ departments }: { departments: Array<{ departmentId: string; departmentName: string; totalAmount: number; count: number }> }) {
  const maxAmt = Math.max(...departments.map(d => d.totalAmount), 1);
  return (
    <div className="divide-y divide-zinc-100">
      {departments.map((dept, idx) => (
        <div key={String(dept.departmentId)} className="group rounded-lg py-3 first:pt-0 last:pb-0 -mx-2 px-2 hover:bg-zinc-50 transition-colors duration-150">
          <div className="flex items-center justify-between mb-1">
            <span className="text-body font-medium text-zinc-700 truncate pr-3">{dept.departmentName}</span>
            <div className="text-right shrink-0">
              <span className="text-body font-semibold tabular-nums text-zinc-900">{compact(dept.totalAmount)}</span>
              <span className="text-caption text-zinc-400 ml-2">{dept.count} PR{dept.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="dept-bar-enter h-full rounded-full bg-zinc-800"
              style={{ width: `${Math.round((dept.totalAmount / maxAmt) * 100)}%`, animationDelay: `${0.18 + idx * 0.09}s` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Row Components ─────────────────────────────────────────────────────

function PrRow({ pr, onClick, showStatus }: { pr: any; onClick: () => void; showStatus?: boolean }) {
  const hasProcurement = pr.items.some((i: any) => i.sourcingType === SourcingType.PROCUREMENT);
  const amountUnknown = hasProcurement && pr.totalAmount === 0;
  return (
    <div
      className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
      onClick={onClick}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[pr.priority] ?? 'bg-zinc-300'}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-body text-zinc-800 leading-snug line-clamp-1">{pr.title}</p>
        <p className="text-label text-zinc-400 mt-0.5">
          {showStatus ? (PR_STATUS_LABELS[pr.status as PrStatusType] ?? pr.status) : requesterName(pr)}
          {' · '}
          {ageLabel(pr.submittedAt ?? pr.createdAt)}
        </p>
      </div>
      <span className={`text-body font-semibold shrink-0 tabular-nums ${amountUnknown ? 'text-amber-500 text-caption font-normal italic' : 'text-zinc-700'}`}>
        {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-zinc-400 shrink-0 transition-colors duration-150" />
    </div>
  );
}

function PoRow({ po, onClick }: { po: any; onClick: () => void }) {
  const statusConfig: Record<string, { text: string; bg: string; border: string; dot: string }> = {
    pending:   { text: 'text-tone-warning-text',   bg: 'bg-tone-warning-bg',   border: 'border-tone-warning-border',   dot: 'bg-amber-500' },
    ordered:   { text: 'text-tone-info-text',    bg: 'bg-tone-info-bg',    border: 'border-tone-info-border',    dot: 'bg-blue-500' },
    received:  { text: 'text-tone-success-text', bg: 'bg-tone-success-bg', border: 'border-tone-success-border', dot: 'bg-emerald-500' },
    cancelled: { text: 'text-tone-neutral-text',    bg: 'bg-tone-neutral-bg',    border: 'border-tone-neutral-border',    dot: 'bg-zinc-400' },
  };
  const cfg = statusConfig[po.status ?? ''] ?? { text: 'text-tone-neutral-text', bg: 'bg-tone-neutral-bg', border: 'border-tone-neutral-border', dot: 'bg-zinc-400' };
  return (
    <div
      className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-zinc-50 -mx-6 px-6 transition-colors duration-150 group"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-body text-zinc-800 leading-snug line-clamp-1">
          {po.poNumber ? `${po.poNumber} — ` : ''}{po.title ?? 'Purchase Order'}
        </p>
        <p className="text-label text-zinc-400 mt-0.5">
          {po.supplierName || 'Online'} · {ageLabel(po.createdAt)}
        </p>
      </div>
      <span className="text-body font-semibold shrink-0 tabular-nums text-zinc-700">{compact(po.totalAmount ?? 0)}</span>
      <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-caption font-medium leading-none capitalize shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {po.status ?? '--'}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-zinc-400 shrink-0 transition-colors duration-150" />
    </div>
  );
}

// ─── Pipeline Row ───────────────────────────────────────────────────────

function PipelineRow({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-body text-zinc-600">{label}</span>
        <span className="text-body font-semibold tabular-nums text-zinc-900">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Insight Row ────────────────────────────────────────────────────────

// ─── Nav Link ───────────────────────────────────────────────────────────

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-1 text-caption font-medium text-zinc-400/70 hover:text-zinc-600 transition-colors duration-150"
      onClick={onClick}
    >
      {label} <ArrowRight className="h-3 w-3" />
    </button>
  );
}

// ─── Empty / Skeleton ───────────────────────────────────────────────────

function EmptyQueue({ icon, message, action }: {
  icon: React.ReactNode;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-2.5">{icon}</div>
      <p className="text-body text-zinc-400">{message}</p>
      {action && (
        <button
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-body font-semibold text-white transition-all duration-200 hover:bg-zinc-800"
          onClick={action.onClick}
        >
          <Plus className="h-3.5 w-3.5" /> {action.label}
        </button>
      )}
    </div>
  );
}

function QueueSkeleton({ count = 3, height = 'h-14' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={`${height} w-full`} />)}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────

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
      className={`rounded-xl border border-zinc-100 bg-white px-5 py-5 shadow-card ${
        onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:border-zinc-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
        <span className={`h-1.5 w-1.5 rounded-full opacity-40 ${dotStyles[variant]}`} />
      </div>
      <p className={`kpi-value text-display font-bold tabular-nums leading-none ${valueStyles[variant]}`}>{value}</p>
    </div>
  );
}
