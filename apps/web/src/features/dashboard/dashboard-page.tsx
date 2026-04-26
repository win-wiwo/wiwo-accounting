import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, XCircle, ArrowRight,
  ShoppingCart, Plus, AlertTriangle, ChevronRight, RotateCcw,
} from 'lucide-react';
import {
  PR_STATUS_LABELS, PR_PRIORITY_LABELS,
  PrStatus, UserRole, SourcingType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usePrStats, usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { usePendingApprovals, usePendingCount } from '@/hooks/use-approvals';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const APPROVER_ROLES = [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO];
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const STATUS_HEALTH = [
  { key: PrStatus.LEVEL1_REVIEW,       label: 'Dept Head Review',    dot: 'bg-blue-400' },
  { key: PrStatus.LEVEL2_REVIEW,       label: 'COO Review',          dot: 'bg-blue-600' },
  { key: PrStatus.LEVEL3_REVIEW,       label: 'CEO Review',          dot: 'bg-indigo-600' },
  { key: PrStatus.PENDING_QUOTATION,   label: 'Pending Procurement', dot: 'bg-purple-500' },
  { key: PrStatus.QUOTED,              label: 'Price Review',        dot: 'bg-purple-700' },
  { key: PrStatus.RETURNED,            label: 'Returned',            dot: 'bg-amber-500' },
  { key: PrStatus.REJECTED,            label: 'Rejected',            dot: 'bg-red-500' },
  { key: PrStatus.DRAFT,               label: 'Draft',               dot: 'bg-slate-400' },
  { key: PrStatus.APPROVED,            label: 'Approved',            dot: 'bg-emerald-500' },
];

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

const priorityVariant = (p: string) => {
  switch (p) {
    case 'urgent': return 'destructive' as const;
    case 'high':   return 'warning' as const;
    case 'medium': return 'info' as const;
    default:       return 'secondary' as const;
  }
};

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isApprover = user ? APPROVER_ROLES.includes(user.role as typeof APPROVER_ROLES[number]) : false;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [queueFilter, setQueueFilter] = useState<'all' | 'urgent' | 'procurement'>('all');

  const { data: statsData, isLoading: statsLoading } = usePrStats();
  const { data: pendingCountData } = usePendingCount();
  const { data: pendingPrsData, isLoading: queueLoading } = usePendingApprovals({ page: 1, limit: 10 });
  const { data: myPrsData, isLoading: myPrsLoading } = usePurchaseRequests(
    { limit: 5 },
    { enabled: !isApprover && !isAdmin },
  );

  const rawPendingPrs = isApprover ? (pendingPrsData?.data ?? []) : [];

  // Use the max of both sources — pendingCount endpoint can lag behind the list
  const pendingCountFromApi = (pendingCountData as unknown as { count?: number })?.count ?? 0;
  const pendingCountFromList = pendingPrsData?.meta?.total ?? rawPendingPrs.length;
  const pendingCount = Math.max(pendingCountFromApi, pendingCountFromList);
  const myPrs = (!isApprover && !isAdmin) ? (myPrsData?.data ?? []) : [];

  // Sort pending queue: urgent first, then oldest
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

  // Derived counts
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

  // Dynamic subtitle
  const subtitle = isApprover
    ? pendingCount > 0
      ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} your approval.`
      : "You're all caught up. No pending approvals."
    : totalPrs === 0
      ? "No purchase requests yet. Create your first one."
      : `${totalPrs} total request${totalPrs > 1 ? 's' : ''} in the system.`;

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="pb-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {greeting()}, {user?.firstName}.
        </h1>
        <p className="text-zinc-500 mt-1 text-[15px]">{subtitle}</p>
      </div>

      {/* ── Hero Action Card ──────────────────────────────────── */}
      {isApprover && (
        statsLoading || queueLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : heroItem ? (
          (() => {
            const requester = heroItem.requesterId && typeof heroItem.requesterId === 'object'
              ? (heroItem.requesterId as unknown as { firstName: string; lastName: string })
              : null;
            const isUrgent = heroItem.priority === 'urgent';
            return (
              <div
                className={`rounded-xl border px-6 py-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isUrgent
                    ? 'border-red-200 bg-white shadow-sm'
                    : 'border-amber-200 bg-white shadow-sm'
                }`}
                onClick={() => navigate('/approvals')}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isUrgent
                      ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      : <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    }
                    <span className={`text-sm font-semibold ${isUrgent ? 'text-destructive' : 'text-amber-800'}`}>
                      {pendingCount} request{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your approval
                    </span>
                  </div>
                  <p className="font-semibold text-base leading-snug truncate">{heroItem.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                    {' · '}
                    <Badge variant={priorityVariant(heroItem.priority)} className="text-[10px] px-1.5 py-0">
                      {PR_PRIORITY_LABELS[heroItem.priority as PrPriorityType]}
                    </Badge>
                    {' · '}
                    {ageLabel(heroItem.submittedAt)}
                  </p>
                </div>
                <Button size="sm" className="shrink-0">
                  Review Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            );
          })()
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-white px-6 py-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">You're all caught up</p>
              <p className="text-sm text-emerald-700">No purchase requests are waiting for your approval.</p>
            </div>
          </div>
        )
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
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

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* Left — primary content */}
        <div className="lg:col-span-8 space-y-6">

          {/* Pending Queue (approvers) */}
          {isApprover && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Approval Queue</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/approvals')}>
                  View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>

              {/* Filter tabs */}
              <div className="px-6 pb-3 flex gap-1.5">
                {(['all', 'urgent', 'procurement'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      queueFilter === f
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'urgent' ? 'Urgent' : 'Procurement'}
                  </button>
                ))}
              </div>

              <CardContent className="pt-0">
                {queueLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {queueFilter === 'all' ? 'No pending approvals.' : `No ${queueFilter} items.`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
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
                          className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors group"
                          onClick={() => navigate('/approvals')}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-snug line-clamp-1">{pr.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                              </span>
                              {hasProcurement && (
                                <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0 font-medium">
                                  Procurement
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-medium shrink-0 ${amountUnknown ? 'text-amber-600 italic text-xs' : ''}`}>
                            {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
                          </span>
                          <Badge variant={priorityVariant(pr.priority)} className="shrink-0 text-[10px] px-1.5">
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                          <span className={`text-xs shrink-0 w-14 text-right ${days >= 7 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {ageLabel(pr.submittedAt)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
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
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">My Recent Requests</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-requests')}>
                  View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {myPrsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : myPrs.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No purchase requests yet.</p>
                    <Button size="sm" onClick={() => navigate('/purchase-requests/new')}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Create your first PR
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {myPrs.map(pr => {
                      const hasProcurement = pr.items.some(i => i.sourcingType === SourcingType.PROCUREMENT);
                      const amountUnknown = hasProcurement && pr.totalAmount === 0;
                      return (
                        <div
                          key={pr._id}
                          className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors group"
                          onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-snug line-clamp-1">{pr.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {PR_STATUS_LABELS[pr.status as PrStatusType] ?? pr.status}
                              {' · '}
                              {ageLabel(pr.submittedAt ?? pr.createdAt)}
                            </p>
                          </div>
                          <span className={`text-sm font-medium shrink-0 ${amountUnknown ? 'text-amber-600 italic text-xs' : ''}`}>
                            {amountUnknown ? 'Pending Quote' : compact(pr.totalAmount)}
                          </span>
                          <Badge variant={priorityVariant(pr.priority)} className="shrink-0 text-[10px] px-1.5">
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right — operational context */}
        <div className="lg:col-span-4 space-y-5">

          {/* Status Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {statsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              ) : totalPrs === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No requests in the system yet.</p>
              ) : (
                <div className="space-y-2">
                  {STATUS_HEALTH.map(({ key, label, dot }) => {
                    const count = byStatus[key]?.count ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                          <span className="text-sm text-muted-foreground">{label}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{count}</span>
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {!isApprover && (
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/purchase-requests/new')}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> New Purchase Request
                  </Button>
                )}
                {isApprover && (
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/approvals')}>
                    <Clock className="h-3.5 w-3.5 mr-2" /> Approval Queue
                    {pendingCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/purchase-requests')}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> All Purchase Requests
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {(pendingTotalValue > 0 || returnedCount > 0 || rejectedCount > 0 || draftCount > 0 || oldestAge > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {pendingTotalValue > 0 && (
                  <InsightRow icon={<ShoppingCart className="h-3.5 w-3.5" />}
                    text={`${full(pendingTotalValue)} awaiting approval`} />
                )}
                {oldestAge >= 5 && (
                  <InsightRow icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    text={`Oldest pending request: ${oldestAge} days`} urgent />
                )}
                {returnedCount > 0 && (
                  <InsightRow icon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                    text={`${returnedCount} request${returnedCount > 1 ? 's' : ''} returned for revision`} />
                )}
                {draftCount > 0 && !isApprover && (
                  <InsightRow icon={<FileText className="h-3.5 w-3.5" />}
                    text={`${draftCount} draft${draftCount > 1 ? 's' : ''} not yet submitted`} />
                )}
                {rejectedCount > 0 && (
                  <InsightRow icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                    text={`${rejectedCount} request${rejectedCount > 1 ? 's' : ''} rejected`} />
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
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
  const borderStyles = {
    default: 'border-zinc-200',
    warning: 'border-amber-200',
    danger:  'border-red-200',
    success: 'border-emerald-200',
  };
  const dotStyles = {
    default: 'bg-zinc-400',
    warning: 'bg-amber-400',
    danger:  'bg-red-500',
    success: 'bg-emerald-500',
  };
  const valueStyles = {
    default: 'text-zinc-900',
    warning: 'text-amber-700',
    danger:  'text-red-600',
    success: 'text-emerald-700',
  };
  return (
    <div
      className={`group rounded-xl border bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] ${borderStyles[variant]} ${onClick ? 'cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <span className={`h-2 w-2 rounded-full ${dotStyles[variant]}`} />
      </div>
      <p className={`text-3xl font-bold tabular-nums leading-none ${valueStyles[variant]}`}>{value}</p>
    </div>
  );
}

function InsightRow({ icon, text, urgent }: { icon: React.ReactNode; text: string; urgent?: boolean }) {
  return (
    <div className={`flex items-start gap-2 text-sm ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
