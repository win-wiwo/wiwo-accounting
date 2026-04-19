import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building, MoreHorizontal, Eye, Pencil } from 'lucide-react';
import { UserRole } from '@prams/shared';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useAuthStore } from '@/stores/auth.store';
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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success' as const;
    case 'inactive': return 'secondary' as const;
    case 'blacklisted': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'blacklisted': return 'Blacklisted';
    default: return status;
  }
};

const taxTypeVariant = (taxType: string) => {
  switch (taxType) {
    case 'vat': return 'info' as const;
    case 'non_vat': return 'secondary' as const;
    default: return 'secondary' as const;
  }
};

const taxTypeLabel = (taxType: string) => {
  switch (taxType) {
    case 'vat': return 'VAT';
    case 'non_vat': return 'Non-VAT';
    default: return taxType;
  }
};

export function SuppliersListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useSuppliers({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const suppliers = data?.data ?? [];
  const meta = data?.meta;
  const canManage =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.ACCOUNTING ||
    user?.role === UserRole.PROCUREMENT;

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage supplier records and information.">
        {canManage && (
          <Button onClick={() => navigate('/suppliers/new')}>
            <Plus className="h-4 w-4" />
            New Supplier
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
                placeholder="Search by company name or TIN..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
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
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={<Building className="h-12 w-12" />}
              title="No suppliers"
              description={canManage ? 'Add your first supplier.' : 'No suppliers to display.'}
              action={
                canManage ? (
                  <Button onClick={() => navigate('/suppliers/new')}>
                    <Plus className="h-4 w-4" /> New Supplier
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow
                      key={supplier._id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/suppliers/${supplier._id}`)}
                    >
                      <TableCell>
                        <div className="max-w-[280px]">
                          <p className="font-medium truncate">{supplier.companyName}</p>
                          {supplier.address && (
                            <p className="text-xs text-muted-foreground truncate">{supplier.address}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{supplier.tin}</TableCell>
                      <TableCell>
                        <Badge variant={taxTypeVariant(supplier.taxType)}>
                          {taxTypeLabel(supplier.taxType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {supplier.contactPerson || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(supplier.status)}>
                          {statusLabel(supplier.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(supplier.createdAt).toLocaleDateString()}
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
                                onSelect={() => navigate(`/suppliers/${supplier._id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </DropdownMenu.Item>
                              {canManage && (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                  onSelect={() => navigate(`/suppliers/${supplier._id}/edit`)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </DropdownMenu.Item>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
