import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { PrStatus, PR_STATUS_LABELS, PR_PRIORITY_LABELS, SourcingType, type PrPriority, type PrStatus as PrStatusType } from '@prams/shared';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { PurchaseRequest } from '@prams/shared';
import { formatCurrency, formatDate, statusVariant, priorityVariant } from './workspace/utils';

function PrCard({ pr, onOpen }: { pr: PurchaseRequest; onOpen: (id: string) => void }) {
  const requester = pr.requesterId as unknown as { firstName: string; lastName: string } | null;
  const department = pr.departmentId as unknown as { name: string } | null;
  const procCount = pr.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{pr.title}</p>
              <Badge variant={statusVariant(pr.status)} className="text-[11px]">
                {PR_STATUS_LABELS[pr.status as PrStatusType] || pr.status}
              </Badge>
              <Badge variant={priorityVariant(pr.priority)} className="text-[11px]">
                {PR_PRIORITY_LABELS[pr.priority as PrPriority]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pr.prNumber} · {requester ? `${requester.firstName} ${requester.lastName}` : '—'} · {department?.name ?? '—'} · {formatDate(pr.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {procCount} item{procCount !== 1 ? 's' : ''} to quote · {formatCurrency(pr.totalAmount || 0)} estimated
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onOpen(pr._id)}
          >
            <Eye className="h-3.5 w-3.5" /> Review
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

export function ProcurementQueuePage() {
  const navigate = useNavigate();
  const { data, isLoading } = usePurchaseRequests({ status: PrStatus.PENDING_QUOTATION, limit: 50 });
  const prs = (data?.data ?? []) as PurchaseRequest[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Queue"
        description="Review purchase requests pending quotation and submit supplier prices."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : prs.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="No PRs awaiting quotation"
          description="All purchase requests awaiting procurement quotation have been processed."
        />
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <PrCard key={pr._id} pr={pr} onOpen={(id) => navigate(`/procurement/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
