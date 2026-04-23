import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ROLE_LABELS,
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  PrStatus,
  UserRole,
  type UserRole as UserRoleType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usePrStats } from '@/hooks/use-purchase-requests';
import { usePendingApprovals, usePendingCount } from '@/hooks/use-approvals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'draft': return 'secondary' as const;
    case 'submitted':
    case 'level1_review':
    case 'level2_review':
    case 'level3_review':
      return 'info' as const;
    case 'approved': return 'success' as const;
    case 'rejected': return 'destructive' as const;
    case 'returned': return 'warning' as const;
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

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: statsData, isLoading: statsLoading } = usePrStats();
  const approverRoles: string[] = [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO];
  const isApprover = user && approverRoles.includes(user.role);

  const { data: pendingCountData } = usePendingCount();
  const pendingCount = (pendingCountData as unknown as { count?: number })?.count ?? 0;

  const { data: pendingPrsData } = usePendingApprovals({ page: 1, limit: 5 });
  const pendingPrs = isApprover ? (pendingPrsData?.data ?? []) : [];

  const stats = (statsData as unknown as { data?: { total: number; byStatus: Record<string, { count: number; totalAmount: number }> } })?.data;
  const byStatus = stats?.byStatus ?? {};

  const totalPrs = stats?.total ?? 0;
  const draftCount = byStatus[PrStatus.DRAFT]?.count ?? 0;
  const pendingReviewCount =
    (byStatus[PrStatus.SUBMITTED]?.count ?? 0) +
    (byStatus[PrStatus.PENDING_QUOTATION]?.count ?? 0) +
    (byStatus[PrStatus.QUOTED]?.count ?? 0) +
    (byStatus[PrStatus.LEVEL1_REVIEW]?.count ?? 0) +
    (byStatus[PrStatus.LEVEL2_REVIEW]?.count ?? 0) +
    (byStatus[PrStatus.LEVEL3_REVIEW]?.count ?? 0);
  const approvedCount = byStatus[PrStatus.APPROVED]?.count ?? 0;
  const rejectedCount = byStatus[PrStatus.REJECTED]?.count ?? 0;
  const returnedCount = byStatus[PrStatus.RETURNED]?.count ?? 0;

  const totalAmount = Object.values(byStatus).reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
  const approvedAmount = byStatus[PrStatus.APPROVED]?.totalAmount ?? 0;

  const summaryCards = [
    {
      label: 'Total PRs',
      value: totalPrs,
      icon: FileText,
      color: 'text-blue-600 bg-blue-50',
      onClick: () => navigate('/purchase-requests'),
    },
    ...(isApprover
      ? [{
          label: 'Pending My Approval',
          value: pendingCount,
          icon: Clock,
          color: 'text-amber-600 bg-amber-50',
          onClick: () => navigate('/approvals'),
        }]
      : [{
          label: 'In Review',
          value: pendingReviewCount,
          icon: Send,
          color: 'text-amber-600 bg-amber-50',
          onClick: () => navigate('/purchase-requests'),
        }]
    ),
    {
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50',
      onClick: () => navigate('/purchase-requests'),
    },
    {
      label: 'Rejected',
      value: rejectedCount,
      icon: XCircle,
      color: 'text-red-600 bg-red-50',
      onClick: () => navigate('/purchase-requests'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}. You're signed in as{' '}
          <span className="font-medium">
            {ROLE_LABELS[user?.role as UserRoleType] || user?.role}
          </span>
          .
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((stat) => (
              <Card
                key={stat.label}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={stat.onClick}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            {totalAmount > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Requested</p>
                <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : totalPrs === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No purchase requests yet.</p>
                {user?.role !== UserRole.ADMIN && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/purchase-requests/new')}
                  >
                    Create your first PR
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byStatus)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([status, data]) => {
                    const pct = totalPrs > 0 ? Math.round((data.count / totalPrs) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <Badge variant={statusVariant(status)} className="w-32 justify-center">
                          {PR_STATUS_LABELS[status as PrStatusType] || status}
                        </Badge>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary/70 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-8 text-right text-sm font-medium">{data.count}</span>
                        <span className="w-20 text-right text-xs text-muted-foreground">
                          {formatCurrency(data.totalAmount)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats / Actions */}
        <div className="space-y-6">
          {/* Financial Summary */}
          {totalAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Approved Amount</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(approvedAmount)}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Drafts</p>
                    <p className="text-lg font-semibold">{draftCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Returned</p>
                    <p className="text-lg font-semibold text-amber-600">{returnedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals for Approvers */}
          {isApprover && pendingPrs.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Pending Your Review</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/approvals')}>
                  View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPrs.slice(0, 5).map((pr) => {
                  const requester = pr.requesterId && typeof pr.requesterId === 'object'
                    ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                    : null;
                  return (
                    <div
                      key={pr._id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{pr.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {requester ? `${requester.firstName} ${requester.lastName}` : '—'} &middot; {formatCurrency(pr.totalAmount)}
                        </p>
                      </div>
                      <Badge variant={priorityVariant(pr.priority)} className="ml-2 shrink-0">
                        {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {user?.role !== UserRole.ADMIN && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/purchase-requests/new')}
                >
                  <FileText className="h-4 w-4 mr-2" /> New Purchase Request
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/purchase-requests')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" /> View All PRs
                </Button>
                {isApprover && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/approvals')}
                  >
                    <Clock className="h-4 w-4 mr-2" /> Approval Queue
                    {pendingCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
