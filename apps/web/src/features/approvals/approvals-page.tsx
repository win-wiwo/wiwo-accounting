import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePendingApprovals, useProcessApproval } from '@/hooks/use-approvals';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const processApproval = useProcessApproval();

  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingApprovals({ page, limit: 10 });

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approved' | 'rejected' | 'returned';
    prId: string;
    prTitle: string;
  }>({ open: false, action: 'approved', prId: '', prTitle: '' });
  const [comments, setComments] = useState('');

  const prs = data?.data ?? [];
  const meta = data?.meta;

  // Determine which level the current user approves at
  const levelLabel = user?.role
    ? APPROVAL_LEVEL_LABELS[
        user.role === 'dept_head' ? 1 : user.role === 'coo' ? 2 : user.role === 'ceo' ? 3 : 0
      ] ?? ''
    : '';

  const handleAction = async () => {
    if (
      (actionDialog.action === 'rejected' || actionDialog.action === 'returned') &&
      !comments.trim()
    ) {
      toast({ title: 'Comments are required', variant: 'error' });
      return;
    }

    try {
      await processApproval.mutateAsync({
        purchaseRequestId: actionDialog.prId,
        action: actionDialog.action,
        comments: comments.trim(),
      });

      const actionLabels = {
        approved: 'approved',
        rejected: 'rejected',
        returned: 'returned for revision',
      };

      toast({
        title: `PR ${actionLabels[actionDialog.action]}`,
        variant: actionDialog.action === 'approved' ? 'success' : 'default',
      });
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }

    setActionDialog({ ...actionDialog, open: false });
    setComments('');
  };

  const openAction = (action: 'approved' | 'rejected' | 'returned', prId: string, prTitle: string) => {
    setComments('');
    setActionDialog({ open: true, action, prId, prTitle });
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr) => {
                    const requester = pr.requesterId && typeof pr.requesterId === 'object'
                      ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                      : null;

                    const dept = pr.departmentId && typeof pr.departmentId === 'object'
                      ? (pr.departmentId as unknown as { name: string })
                      : null;

                    return (
                      <TableRow key={pr._id}>
                        <TableCell className="font-mono text-sm">{pr.prNumber}</TableCell>
                        <TableCell>
                          <div className="max-w-[220px]">
                            <p className="font-medium truncate">{pr.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{pr.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{dept?.name ?? '—'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(pr.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(pr.priority)}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pr.submittedAt
                            ? new Date(pr.submittedAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openAction('approved', pr._id, pr.title)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => openAction('returned', pr._id, pr.title)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openAction('rejected', pr._id, pr.title)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => { setActionDialog({ ...actionDialog, open }); if (!open) setComments(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approved' && 'Approve Purchase Request'}
              {actionDialog.action === 'rejected' && 'Reject Purchase Request'}
              {actionDialog.action === 'returned' && 'Return for Revision'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approved' &&
                `Approve "${actionDialog.prTitle}" and advance it to the next approval level.`}
              {actionDialog.action === 'rejected' &&
                `Reject "${actionDialog.prTitle}". The requester will be notified.`}
              {actionDialog.action === 'returned' &&
                `Return "${actionDialog.prTitle}" to the requester for revision.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {actionDialog.action !== 'approved' && <span className="text-destructive">*</span>}
            </Label>
            <textarea
              id="comments"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={
                actionDialog.action === 'approved'
                  ? 'Optional comments...'
                  : 'Provide a reason (required)...'
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog({ ...actionDialog, open: false }); setComments(''); }}>
              Cancel
            </Button>
            <Button
              variant={
                actionDialog.action === 'approved'
                  ? 'default'
                  : actionDialog.action === 'rejected'
                    ? 'destructive'
                    : 'outline'
              }
              onClick={handleAction}
              disabled={processApproval.isPending}
            >
              {actionDialog.action === 'approved' && (
                <><CheckCircle2 className="h-4 w-4" /> Approve</>
              )}
              {actionDialog.action === 'rejected' && (
                <><XCircle className="h-4 w-4" /> Reject</>
              )}
              {actionDialog.action === 'returned' && (
                <><RotateCcw className="h-4 w-4" /> Return</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
