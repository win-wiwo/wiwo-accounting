import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import {
  PR_STATUS_LABELS,
  PR_STATUSES,
  PR_PRIORITY_LABELS,
  PR_PRIORITIES,
  PrStatus,
  UserRole,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePurchaseRequests, useSubmitPr, useDeletePr } from '@/hooks/use-purchase-requests';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export function PrListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'submit' | 'delete';
    prId: string;
    prTitle: string;
  }>({ open: false, type: 'submit', prId: '', prTitle: '' });

  const submitMutation = useSubmitPr();
  const deleteMutation = useDeletePr();

  const { data, isLoading } = usePurchaseRequests({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    requestType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const prs = data?.data ?? [];
  const meta = data?.meta;
  const canCreate = user?.role !== UserRole.ADMIN;

  const handleConfirm = async () => {
    const { type, prId } = confirmDialog;
    try {
      if (type === 'submit') {
        await submitMutation.mutateAsync(prId);
        toast({ title: 'PR submitted', description: 'Your purchase request is now under review.', variant: 'success' });
      } else {
        await deleteMutation.mutateAsync(prId);
        toast({ title: 'PR deleted', variant: 'success' });
      }
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Requests" description="Create and track purchase requests and job requests.">
        {canCreate && (
          <Button onClick={() => navigate('/purchase-requests/new')}>
            <Plus className="h-4 w-4" />
            New PR
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or PR number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PR_STATUS_LABELS[s as PrStatusType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PR_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PR_PRIORITY_LABELS[p as PrPriorityType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase_request">Purchase Request</SelectItem>
                <SelectItem value="job_request">Job Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : prs.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No purchase requests"
              description={canCreate ? 'Create your first purchase request.' : 'No purchase requests to display.'}
              action={
                canCreate ? (
                  <Button onClick={() => navigate('/purchase-requests/new')}>
                    <Plus className="h-4 w-4" /> New PR
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr) => {
                    const isDraft = pr.status === PrStatus.DRAFT;
                    const isReturned = pr.status === PrStatus.RETURNED;
                    const isOwner = pr.requesterId && typeof pr.requesterId === 'object'
                      ? (pr.requesterId as unknown as { _id: string })._id === user?._id
                      : pr.requesterId === user?._id;

                    return (
                      <TableRow
                        key={pr._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {pr.prNumber || <span className="text-muted-foreground italic">Draft</span>}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="font-medium truncate">{pr.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{pr.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(pr.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(pr.priority)}>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(pr.status)}>
                            {PR_STATUS_LABELS[pr.status as PrStatusType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                                align="end"
                              >
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                  onSelect={() => navigate(`/purchase-requests/${pr._id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </DropdownMenu.Item>
                                {isOwner && (isDraft || isReturned) && (
                                  <>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                      onSelect={() => navigate(`/purchase-requests/${pr._id}/edit`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" /> Edit
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-blue-600 outline-none hover:bg-blue-50"
                                      onSelect={() =>
                                        setConfirmDialog({ open: true, type: 'submit', prId: pr._id, prTitle: pr.title })
                                      }
                                    >
                                      <Send className="h-3.5 w-3.5" /> Submit
                                    </DropdownMenu.Item>
                                  </>
                                )}
                                {isOwner && isDraft && (
                                  <>
                                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
                                      onSelect={() =>
                                        setConfirmDialog({ open: true, type: 'delete', prId: pr._id, prTitle: pr.title })
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </DropdownMenu.Item>
                                  </>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'submit' ? 'Submit Purchase Request' : 'Delete Purchase Request'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'submit'
                ? `Submit "${confirmDialog.prTitle}" for approval? This will generate a PR number and start the approval workflow.`
                : `Permanently delete "${confirmDialog.prTitle}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirm}
            >
              {confirmDialog.type === 'submit' ? 'Submit' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
