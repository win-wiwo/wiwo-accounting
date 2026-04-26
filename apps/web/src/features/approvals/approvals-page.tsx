import { useState, useMemo } from 'react';
import { CheckCircle2, ChevronRight, ShoppingCart, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import {
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
  SourcingType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePendingApprovals } from '@/hooks/use-approvals';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PrApprovalModal } from './pr-approval-modal';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function relativeAge(dateStr: string | null | undefined): { label: string; days: number } {
  if (!dateStr) return { label: '—', days: 0 };
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

const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'info' as const;
    default: return 'secondary' as const;
  }
};

function StatChip({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'urgent' | 'warning';
}) {
  const styles = {
    default: 'bg-background border-border text-foreground',
    urgent: 'bg-red-50 border-red-200 text-destructive',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-lg border px-4 py-2.5 min-w-[90px] ${styles[variant]}`}>
      <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{label}</p>
    </div>
  );
}

export function ApprovalsPage() {
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingApprovals({ page, limit: 10 });

  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rawPrs = data?.data ?? [];
  const meta = data?.meta;

  // Sort: urgent/high/medium/low first, then oldest first within same priority
  const prs = useMemo(() => {
    return [...rawPrs].sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (pDiff !== 0) return pDiff;
      return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
    });
  }, [rawPrs]);

  const prIds = prs.map((pr) => pr._id);

  // Queue intelligence stats
  const urgentCount = prs.filter((pr) => pr.priority === 'urgent').length;
  const pendingQuoteCount = prs.filter((pr) => {
    const hasProcurement = pr.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT);
    return hasProcurement && pr.totalAmount === 0;
  }).length;
  const knownValue = prs.reduce((sum, pr) => {
    const hasProcurement = pr.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT);
    return hasProcurement && pr.totalAmount === 0 ? sum : sum + pr.totalAmount;
  }, 0);
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
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description={levelLabel ? `Pending your review as ${levelLabel}` : 'PRs awaiting your approval'}
      />

      {/* Queue intelligence stat chips */}
      {!isLoading && prs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatChip label="Pending" value={meta?.total ?? prs.length} />
          {urgentCount > 0 && (
            <StatChip label="Urgent" value={urgentCount} variant="urgent" />
          )}
          {knownValue > 0 && (
            <StatChip label="Known Value" value={formatCurrency(knownValue)} />
          )}
          {pendingQuoteCount > 0 && (
            <StatChip label="Pending Quote" value={`+${pendingQuoteCount}`} variant="warning" />
          )}
          {oldestDays > 0 && (
            <StatChip
              label="Oldest Pending"
              value={`${oldestDays}d`}
              variant={oldestDays >= 7 ? 'urgent' : 'default'}
            />
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : prs.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12" />}
              title="All caught up!"
              description="No purchase requests are waiting for your approval."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[152px]">PR Number</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead className="w-[160px]">Requester</TableHead>
                    <TableHead className="text-right w-[160px]">Amount</TableHead>
                    <TableHead className="w-[110px]">Priority</TableHead>
                    <TableHead className="w-[120px]">Age</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr, index) => {
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
                    const isUrgent = pr.priority === 'urgent';

                    return (
                      <TableRow
                        key={pr._id}
                        className={`cursor-pointer transition-colors group ${
                          isUrgent
                            ? 'bg-red-50/40 hover:bg-red-50/70'
                            : 'hover:bg-muted/40'
                        }`}
                        onClick={() => openModal(index)}
                      >
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {isUrgent && (
                            <span className="inline-block w-0.5 h-4 rounded-full bg-destructive mr-2 align-middle" />
                          )}
                          {pr.prNumber}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="font-semibold text-sm line-clamp-2 leading-snug">{pr.title}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {dept && (
                                <span className="text-[11px] text-muted-foreground">{dept.name}</span>
                              )}
                              {hasProcurement && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                  <ShoppingCart className="h-2.5 w-2.5" /> Procurement
                                </span>
                              )}
                              {isRevised && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                  <RotateCcw className="h-2.5 w-2.5" /> Revised
                                </span>
                              )}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Need Date Passed
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold text-sm ${amountIsUnknown ? 'text-amber-600 italic font-normal' : ''}`}>
                            {amountIsUnknown ? 'Pending Quote' : formatCurrency(pr.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(pr.priority)}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm flex items-center gap-1 whitespace-nowrap ${ageDays >= 7 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {ageDays >= 5 && <Clock className="h-3 w-3 shrink-0" />}
                            {ageLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {meta && (
                <div className="border-t px-4">
                  <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
