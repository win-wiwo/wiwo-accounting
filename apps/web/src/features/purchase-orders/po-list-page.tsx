import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ShoppingCart, MoreHorizontal, Eye, Pencil, Send } from 'lucide-react';
import { UserRole } from '@prams/shared';
import { usePurchaseOrders, useSubmitPurchaseOrder } from '@/hooks/use-purchase-orders';
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

const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  purchase_request: 'Purchase Request',
  job_request: 'Job Request',
};

const statusVariant = (status: string) => {
  switch (status) {
    case 'draft': return 'secondary' as const;
    case 'submitted': return 'info' as const;
    case 'approved': return 'success' as const;
    case 'issued': return 'default' as const;
    case 'cancelled': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export function PoListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    poId: string;
    poNumber: string;
  }>({ open: false, poId: '', poNumber: '' });

  const submitMutation = useSubmitPurchaseOrder();

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sourceRequestType: sourceTypeFilter !== 'all' ? sourceTypeFilter : undefined,
  });

  const pos = data?.data ?? [];
  const meta = data?.meta;
  const canCreate = user?.role === UserRole.PROCUREMENT || user?.role === UserRole.ADMIN;

  const handleSubmitConfirm = async () => {
    try {
      await submitMutation.mutateAsync(confirmDialog.poId);
      toast({ title: 'PO submitted', description: 'The purchase order has been submitted for approval.', variant: 'success' });
    } catch {
      toast({ title: 'Action failed', variant: 'error' });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description="Create, manage, and track purchase orders.">
        {canCreate && (
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="h-4 w-4" />
            New PO
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
                placeholder="Search by PO number..."
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
                {Object.entries(PO_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceTypeFilter} onValueChange={(v) => { setSourceTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
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
          ) : pos.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title="No purchase orders"
              description={canCreate ? 'Create your first purchase order.' : 'No purchase orders to display.'}
              action={
                canCreate ? (
                  <Button onClick={() => navigate('/purchase-orders/new')}>
                    <Plus className="h-4 w-4" /> New PO
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Source Request</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => {
                    const isDraft = po.status === 'draft';
                    const canEditPo = isDraft && canCreate;

                    const supplierName =
                      po.supplierId && typeof po.supplierId === 'object'
                        ? (po.supplierId as { name?: string; companyName?: string }).name ||
                          (po.supplierId as { companyName?: string }).companyName ||
                          '—'
                        : '—';

                    const sourceDisplay = po.sourceRequestNumber
                      ? `${po.sourceRequestNumber}`
                      : po.purchaseRequestId && typeof po.purchaseRequestId === 'object'
                        ? (po.purchaseRequestId as { prNumber?: string }).prNumber || '—'
                        : '—';

                    const sourceTypeLabel = SOURCE_TYPE_LABELS[po.sourceRequestType] || po.sourceRequestType;

                    return (
                      <TableRow
                        key={po._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${po._id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {po.poNumber || <span className="text-muted-foreground italic">Draft</span>}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{sourceDisplay}</p>
                            <p className="text-xs text-muted-foreground truncate">{sourceTypeLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">{supplierName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(po.status)}>
                            {PO_STATUS_LABELS[po.status] || po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(po.createdAt).toLocaleDateString()}
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
                                  onSelect={() => navigate(`/purchase-orders/${po._id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </DropdownMenu.Item>
                                {canEditPo && (
                                  <>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                      onSelect={() => navigate(`/purchase-orders/${po._id}/edit`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" /> Edit
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-blue-600 outline-none hover:bg-blue-50"
                                      onSelect={() =>
                                        setConfirmDialog({
                                          open: true,
                                          poId: po._id,
                                          poNumber: po.poNumber || 'Draft PO',
                                        })
                                      }
                                    >
                                      <Send className="h-3.5 w-3.5" /> Submit
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

      {/* Submit Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Purchase Order</DialogTitle>
            <DialogDescription>
              Submit &ldquo;{confirmDialog.poNumber}&rdquo; for approval? This will route it through the approval workflow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSubmitConfirm}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
