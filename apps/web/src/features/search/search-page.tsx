import { useState, useCallback, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
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
import { DatePicker } from '@/components/ui/date-picker';
import {
  PR_STATUS_LABELS,
  PR_STATUSES,
  PR_PRIORITY_LABELS,
  PR_PRIORITIES,
  SourcingType,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
  type PurchaseRequest,
} from '@prams/shared';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { useDepartments } from '@/hooks/use-departments';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  PageHeader,
  Surface,
  StatusBadge,
  EmptyState,
  ListSkeleton,
  Pagination,
  GhostButton,
  PrimaryButton,
  prStatusTone,
  prPriorityTone,
  premiumSelectTriggerClass,
} from '@/components/premium';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { PurchaseRequestsQuery } from '@/lib/api-services';

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

/** True when any procurement item still has no quoted price */
function hasPendingQuote(pr: PurchaseRequest): boolean {
  return pr.items.some(
    (item) => item.sourcingType === SourcingType.PROCUREMENT && item.totalPrice === 0,
  );
}

const SORT_OPTIONS = [
  { value: 'createdAt',   label: 'Created Date' },
  { value: 'totalAmount', label: 'Amount' },
  { value: 'prNumber',    label: 'PR Number' },
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
    search:       params.get('search') || '',
    statuses:     params.get('status')?.split(',').filter(Boolean) || [],
    priority:     params.get('priority') || 'all',
    departmentId: params.get('departmentId') || 'all',
    dateFrom:     params.get('dateFrom') || '',
    dateTo:       params.get('dateTo') || '',
    amountMin:    params.get('amountMin') || '',
    amountMax:    params.get('amountMax') || '',
    sort:         params.get('sort') || 'createdAt',
    order:        (params.get('order') as 'asc' | 'desc') || 'desc',
    page:         Number(params.get('page')) || 1,
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

// ─── Reusable styled inputs ───────────────────────────────────

const PREMIUM_INPUT_CLASS =
  'w-full h-10 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3.5 text-[13px] text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50/80 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity';

// ─── Component ────────────────────────────────────────────────

export function SearchPage() {
  usePageTitle('Search');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = readFiltersFromParams(searchParams);

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

  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: deptData } = useDepartments({ limit: 100 });
  const departments = deptData?.data ?? [];

  const queryParams = useMemo((): PurchaseRequestsQuery => {
    const params: PurchaseRequestsQuery = {
      page: filters.page,
      limit,
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
  }, [filters, limit]);

  const { data, isLoading } = usePurchaseRequests(queryParams);
  const prs = data?.data ?? [];
  const meta = data?.meta;

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

  const handleSearch = () => commitFilters(1);

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
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Search & Monitor"
        description="Search, filter, and export purchase requests."
        actions={
          <GhostButton onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {exporting ? 'Exporting...' : 'Export'}
          </GhostButton>
        }
      />

      {/* ── Advanced Search panel ───────────────────────────── */}
      <Surface delay={0.04} elevation="subtle">
        <button
          type="button"
          onClick={() => setFiltersExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 cursor-pointer select-none hover:bg-zinc-50/50 transition-colors duration-150"
        >
          <span className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <Search className="h-4 w-4 text-zinc-400" />
            Advanced Search
            {hasActiveFilters && (
              <StatusBadge tone="info" className="ml-1.5">Filters Active</StatusBadge>
            )}
          </span>
          {filtersExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {filtersExpanded && (
          <div className="px-6 pb-6 space-y-5 border-t border-zinc-100 pt-5">
            {/* Text search */}
            <div>
              <FieldLabel>Search</FieldLabel>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by PR number, title, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className={cn(PREMIUM_INPUT_CLASS, 'pl-10')}
                />
              </div>
            </div>

            {/* Status pills */}
            <div>
              <FieldLabel>Status</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PR_STATUSES.map((s) => {
                  const isActive = selectedStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition-colors duration-150',
                        isActive
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                      )}
                    >
                      {PR_STATUS_LABELS[s as PrStatusType]}
                      {isActive && <X className="ml-1.5 h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Divider />

            {/* Priority + Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className={premiumSelectTriggerClass}>
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
                <FieldLabel>Department</FieldLabel>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className={premiumSelectTriggerClass}>
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

            {/* Date range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Date From</FieldLabel>
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="From date..."
                />
              </div>
              <div>
                <FieldLabel>Date To</FieldLabel>
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="To date..."
                />
              </div>
            </div>

            {/* Amount range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Min Amount</FieldLabel>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className={cn(PREMIUM_INPUT_CLASS, 'tabular-nums')}
                />
              </div>
              <div>
                <FieldLabel>Max Amount</FieldLabel>
                <input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className={cn(PREMIUM_INPUT_CLASS, 'tabular-nums')}
                />
              </div>
            </div>

            <Divider />

            {/* Sort */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Sort By</FieldLabel>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className={premiumSelectTriggerClass}>
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
                <FieldLabel>Sort Order</FieldLabel>
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className={cn(PREMIUM_INPUT_CLASS, 'flex items-center gap-2 cursor-pointer hover:bg-white')}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{order === 'asc' ? 'Ascending' : 'Descending'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
              <GhostButton
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                <X className="h-3.5 w-3.5" /> Clear Filters
              </GhostButton>
              <PrimaryButton onClick={handleSearch}>
                <Search className="h-3.5 w-3.5" /> Search
              </PrimaryButton>
            </div>
          </div>
        )}
      </Surface>

      {/* ── Results summary ────────────────────────────────── */}
      {meta && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[13px] text-zinc-500">
          <span>
            <span className="font-semibold text-zinc-800 tabular-nums">{meta.total}</span> result
            {meta.total !== 1 ? 's' : ''} found
          </span>
          {prs.length > 0 && (
            <span>
              Page total:{' '}
              <span className="font-semibold text-zinc-800 tabular-nums">
                {formatCurrency(pageTotalAmount)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────── */}
      <Surface delay={0.08}>
        {isLoading ? (
          <ListSkeleton rows={6} rowHeight="h-14" />
        ) : prs.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No purchase requests found"
            description={
              hasActiveFilters
                ? 'Try adjusting your search filters.'
                : 'No purchase requests match the current criteria.'
            }
            action={
              hasActiveFilters ? (
                <GhostButton onClick={handleClearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </GhostButton>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto overflow-y-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <Th>PR Number</Th>
                    <Th>Title</Th>
                    <Th>Requester</Th>
                    <Th>Department</Th>
                    <Th align="right">Amount</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr, idx) => {
                    const requester =
                      pr.requesterId && typeof pr.requesterId === 'object'
                        ? (pr.requesterId as unknown as { firstName: string; lastName: string })
                        : null;
                    const dept =
                      pr.departmentId && typeof pr.departmentId === 'object'
                        ? (pr.departmentId as unknown as { name: string })
                        : null;

                    return (
                      <tr
                        key={pr._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                      >
                        <td className="px-5 py-4">
                          {pr.prNumber ? (
                            <span className="font-mono text-[13px] font-medium text-zinc-800 tracking-tight">
                              {pr.prNumber}
                            </span>
                          ) : (
                            <span className="text-[13px] italic text-zinc-400">Draft</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-zinc-800 leading-snug truncate max-w-[260px] group-hover:text-zinc-950 transition-colors duration-150">
                            {pr.title}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-zinc-500">
                          {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-zinc-500">
                          {dept ? dept.name : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {hasPendingQuote(pr) ? (
                            <span className="text-[13px] font-semibold text-amber-600">TBD</span>
                          ) : (
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-800">
                              {formatCurrency(pr.totalAmount)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={prPriorityTone(pr.priority)} dot muted>
                            {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={prStatusTone(pr.status)} dot>
                            {PR_STATUS_LABELS[pr.status as PrStatusType]}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-[13px] tabular-nums text-zinc-400 whitespace-nowrap">
                          {new Date(pr.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-100">
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
                    className="flex flex-col gap-2 p-4 cursor-pointer hover:bg-zinc-50/80 transition-colors duration-150"
                    onClick={() => navigate(`/purchase-requests/${pr._id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12px] text-zinc-400">
                        {pr.prNumber || 'Draft'}
                      </span>
                      <StatusBadge tone={prStatusTone(pr.status)} dot>
                        {PR_STATUS_LABELS[pr.status as PrStatusType]}
                      </StatusBadge>
                    </div>
                    <p className="text-[13px] font-medium text-zinc-800 truncate">{pr.title}</p>
                    <div className="flex items-center justify-between text-[12px] text-zinc-500">
                      <span className="truncate pr-2">
                        {requester ? `${requester.firstName} ${requester.lastName}` : '—'}
                        {dept ? ` · ${dept.name}` : ''}
                      </span>
                      <span className="font-semibold tabular-nums shrink-0">
                        {hasPendingQuote(pr) ? (
                          <span className="text-amber-600">TBD</span>
                        ) : (
                          <span className="text-zinc-800">{formatCurrency(pr.totalAmount)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={prPriorityTone(pr.priority)} dot muted>
                        {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                      </StatusBadge>
                      <span className="text-[12px] text-zinc-400 tabular-nums">
                        {new Date(pr.createdAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={handlePageChange}
                limit={limit}
                onLimitChange={(l) => { setLimit(l); handlePageChange(1); }}
              />
            )}
          </>
        )}
      </Surface>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
      {children}
    </p>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}
