import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import {
  PR_STATUS_LABELS,
  PR_STATUSES,
  PR_PRIORITY_LABELS,
  PR_PRIORITIES,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/lib/api-client';
import type { PurchaseRequestsQuery } from '@/lib/api-services';

// ─── Helpers ──────────────────────────────────────────────────

const statusVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary' as const;
    case 'submitted':
    case 'level1_review':
    case 'level2_review':
    case 'level3_review':
      return 'info' as const;
    case 'approved':
      return 'success' as const;
    case 'rejected':
      return 'destructive' as const;
    case 'returned':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
};

const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'destructive' as const;
    case 'high':
      return 'warning' as const;
    case 'medium':
      return 'info' as const;
    default:
      return 'secondary' as const;
  }
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'totalAmount', label: 'Amount' },
  { value: 'prNumber', label: 'PR Number' },
  { value: 'submittedAt', label: 'Submitted Date' },
] as const;

// ─── URL Param Helpers ────────────────────────────────────────

function readFiltersFromParams(params: URLSearchParams): {
  search: string;
  statuses: string[];
  priority: string;
  departmentId: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
} {
  return {
    search: params.get('search') || '',
    statuses: params.get('status')?.split(',').filter(Boolean) || [],
    priority: params.get('priority') || 'all',
    departmentId: params.get('departmentId') || 'all',
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
    amountMin: params.get('amountMin') || '',
    amountMax: params.get('amountMax') || '',
    sort: params.get('sort') || 'createdAt',
    order: (params.get('order') as 'asc' | 'desc') || 'desc',
    page: Number(params.get('page')) || 1,
  };
}

function writeFiltersToParams(filters: ReturnType<typeof readFiltersFromParams>): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.search) p.set('search', filters.search);
  if (filters.statuses.length > 0) p.set('status', filters.statuses.join(','));
  if (filters.priority && filters.priority !== 'all') p.set('priority', filters.priority);
  if (filters.departmentId && filters.departmentId !== 'all')
    p.set('departmentId', filters.departmentId);
  if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) p.set('dateTo', filters.dateTo);
  if (filters.amountMin) p.set('amountMin', filters.amountMin);
  if (filters.amountMax) p.set('amountMax', filters.amountMax);
  if (filters.sort && filters.sort !== 'createdAt') p.set('sort', filters.sort);
  if (filters.order && filters.order !== 'desc') p.set('order', filters.order);
  if (filters.page > 1) p.set('page', String(filters.page));
  return p;
}

// ─── Component ────────────────────────────────────────────────

export function SearchPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial filter state from URL
  const filters = readFiltersFromParams(searchParams);

  // Local state mirrors URL params — we commit to URL on "Search"
  const [search, setSearch] = useState(filters.search);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filters.statuses);
  const [priority, setPriority] = useState(filters.priority);
  const [departmentId, setDepartmentId] = useState(filters.departmentId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [amountMin, setAmountMin] = useState(filters.amountMin);
  const [amountMax, setAmountMax] = useState(filters.amountMax);
  const [sort, setSort] = useState(filters.sort);
  const [order, setOrder] = useState<'asc' | 'desc'>(filters.order);
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    // Auto-expand if any advanced filter is active
    return !!(
      filters.statuses.length > 0 ||
      (filters.priority && filters.priority !== 'all') ||
      (filters.departmentId && filters.departmentId !== 'all') ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.amountMin ||
      filters.amountMax
    );
  });

  const [exporting, setExporting] = useState(false);

  // Departments for dropdown
  const { data: deptData } = useDepartments({ limit: 100 });
  const departments = deptData?.data ?? [];

  // Build query params for the API call (from URL state, not local state)
  const queryParams = useMemo((): PurchaseRequestsQuery => {
    const params: PurchaseRequestsQuery = {
      page: filters.page,
      limit: 15,
      sort: filters.sort,
      order: filters.order,
    };
    if (filters.search) params.search = filters.search;
    if (filters.statuses.length > 0) params.status = filters.statuses.join(',');
    if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
    if (filters.departmentId && filters.departmentId !== 'all')
      params.departmentId = filters.departmentId;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.amountMin) params.amountMin = Number(filters.amountMin);
    if (filters.amountMax) params.amountMax = Number(filters.amountMax);
    return params;
  }, [filters]);

  const { data, isLoading } = usePurchaseRequests(queryParams);
  const prs = data?.data ?? [];
  const meta = data?.meta;

  // Commit local filters to URL (triggers re-fetch via queryParams memo)
  const commitFilters = useCallback(
    (overridePage?: number) => {
      const nextPage = overridePage ?? 1;
      const nextParams = writeFiltersToParams({
        search,
        statuses: selectedStatuses,
        priority,
        departmentId,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        sort,
        order,
        page: nextPage,
      });
      setSearchParams(nextParams, { replace: true });
    },
    [
      search,
      selectedStatuses,
      priority,
      departmentId,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sort,
      order,
      setSearchParams,
    ],
  );

  const handleSearch = () => {
    commitFilters(1);
  };

  const handlePageChange = useCallback(
    (newPage: number) => {
      const nextParams = writeFiltersToParams({
        search,
        statuses: selectedStatuses,
        priority,
        departmentId,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        sort,
        order,
        page: newPage,
      });
      setSearchParams(nextParams, { replace: true });
    },
    [
      search,
      selectedStatuses,
      priority,
      departmentId,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sort,
      order,
      setSearchParams,
    ],
  );

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    setPriority('all');
    setDepartmentId('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSort('createdAt');
    setOrder('desc');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const toggleSortOrder = () => {
    setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // ─── Export ───────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportParams: Record<string, string | number> = {};
      if (filters.search) exportParams.search = filters.search;
      if (filters.statuses.length > 0) exportParams.status = filters.statuses.join(',');
      if (filters.priority && filters.priority !== 'all') exportParams.priority = filters.priority;
      if (filters.departmentId && filters.departmentId !== 'all')
        exportParams.departmentId = filters.departmentId;
      if (filters.dateFrom) exportParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) exportParams.dateTo = filters.dateTo;
      if (filters.amountMin) exportParams.amountMin = Number(filters.amountMin);
      if (filters.amountMax) exportParams.amountMax = Number(filters.amountMax);
      exportParams.sort = filters.sort;
      exportParams.order = filters.order;

      const response = await apiClient.get('/reports/pr-summary', {
        params: exportParams,
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pr-search-results-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export complete',
        description: 'Your search results have been downloaded.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Export failed',
        description: 'Unable to export search results. Please try again.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  // Compute totals from current page (server-side total is in meta)
  const pageTotalAmount = prs.reduce((sum, pr) => sum + (pr.totalAmount ?? 0), 0);

  const hasActiveFilters =
    search ||
    selectedStatuses.length > 0 ||
    (priority && priority !== 'all') ||
    (departmentId && departmentId !== 'all') ||
    dateFrom ||
    dateTo ||
    amountMin ||
    amountMax;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader title="Search & Monitor" description="Search, filter, and export purchase requests.">
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </PageHeader>

      {/* Search & Filters Panel */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none px-6 py-4"
          onClick={() => setFiltersExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Advanced Search
              {hasActiveFilters && (
                <Badge variant="info" className="ml-2 text-xs">
                  Filters Active
                </Badge>
              )}
            </CardTitle>
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {filtersExpanded && (
          <CardContent className="px-6 pb-6 pt-0 space-y-5">
            {/* Text Search */}
            <div>
              <Label htmlFor="search-input" className="text-sm font-medium">
                Search
              </Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Search by PR number, title, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Pills */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PR_STATUSES.map((s) => {
                  const isActive = selectedStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-accent'
                      }`}
                    >
                      {PR_STATUS_LABELS[s as PrStatusType]}
                      {isActive && <X className="ml-1.5 h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Row: Priority, Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="priority-filter" className="text-sm font-medium">
                  Priority
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority-filter" className="mt-1.5">
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
              </div>

              <div>
                <Label htmlFor="department-filter" className="text-sm font-medium">
                  Department
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="department-filter" className="mt-1.5">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Date Range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date-from" className="text-sm font-medium">
                  Date From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-sm font-medium">
                  Date To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Row: Amount Range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount-min" className="text-sm font-medium">
                  Min Amount
                </Label>
                <Input
                  id="amount-min"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="amount-max" className="text-sm font-medium">
                  Max Amount
                </Label>
                <Input
                  id="amount-max"
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Separator />

            {/* Row: Sort */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sort-field" className="text-sm font-medium">
                  Sort By
                </Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger id="sort-field" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Sort Order</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1.5 w-full justify-start gap-2"
                  onClick={toggleSortOrder}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {order === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
              <Button type="button" onClick={handleSearch}>
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      {meta && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{meta.total}</span> result
            {meta.total !== 1 ? 's' : ''} found
          </span>
          {prs.length > 0 && (
            <span>
              Page total: <span className="font-medium text-foreground">{formatCurrency(pageTotalAmount)}</span>
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : prs.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No purchase requests found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your search filters.'
                  : 'No purchase requests match the current criteria.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={handleClearFilters}>
                    <X className="h-4 w-4" /> Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PR Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prs.map((pr) => {
                      const requester =
                        pr.requesterId && typeof pr.requesterId === 'object'
                          ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                          : null;
                      const dept =
                        pr.departmentId && typeof pr.departmentId === 'object'
                          ? (pr.departmentId as unknown as { name: string })
                          : null;

                      return (
                        <TableRow
                          key={pr._id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                        >
                          <TableCell className="font-mono text-sm">
                            {pr.prNumber || (
                              <span className="text-muted-foreground italic">Draft</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[220px]">
                              <p className="font-medium truncate">{pr.title}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {requester
                              ? `${requester.firstName} ${requester.lastName}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {dept ? dept.name : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(pr.totalAmount)}
                          </TableCell>
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
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(pr.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y">
                {prs.map((pr) => {
                  const requester =
                    pr.requesterId && typeof pr.requesterId === 'object'
                      ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                      : null;
                  const dept =
                    pr.departmentId && typeof pr.departmentId === 'object'
                      ? (pr.departmentId as unknown as { name: string })
                      : null;

                  return (
                    <div
                      key={pr._id}
                      className="flex flex-col gap-2 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {pr.prNumber || 'Draft'}
                        </span>
                        <Badge variant={statusVariant(pr.status)} className="text-xs">
                          {PR_STATUS_LABELS[pr.status as PrStatusType]}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{pr.title}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {requester
                            ? `${requester.firstName} ${requester.lastName}`
                            : '-'}
                          {dept ? ` - ${dept.name}` : ''}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(pr.totalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityVariant(pr.priority)} className="text-xs">
                          {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {meta && (
                <div className="border-t px-4">
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
