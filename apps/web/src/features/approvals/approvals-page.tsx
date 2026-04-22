import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
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

const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'info' as const;
    default: return 'secondary' as const;
  }
};

export function ApprovalsPage() {
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingApprovals({ page, limit: 10 });

  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const prs = data?.data ?? [];
  const prIds = prs.map((pr) => pr._id);
  const meta = data?.meta;

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
                    <TableHead>PR Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
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

                    return (
                      <TableRow
                        key={pr._id}
                        className="cursor-pointer"
                        onClick={() => openModal(index)}
                      >
                        <TableCell className="font-mono text-sm">{pr.prNumber}</TableCell>
                        <TableCell>
                          <div className="max-w-[240px]">
                            <p className="font-medium truncate">{pr.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{pr.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{dept?.name ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(pr.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(pr.priority)}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pr.submittedAt ? new Date(pr.submittedAt).toLocaleDateString() : '—'}
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
