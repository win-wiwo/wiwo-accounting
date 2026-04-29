import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  MoreHorizontal,
  Eye,
  Pencil,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '@prams/shared';
import { useSuppliers, useSuppliersStats, useUpdateSupplier } from '@/hooks/use-suppliers';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

type SupplierRow = {
  _id: string;
  companyName: string;
  address: string;
  taxType: string;
  tin: string;
  category: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_DOT: Record<string, string> = {
  active:      'bg-emerald-400',
  inactive:    'bg-zinc-300',
  blacklisted: 'bg-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  active:      'Active',
  inactive:    'Inactive',
  blacklisted: 'Blacklisted',
};
const STATUS_TEXT: Record<string, string> = {
  active:      'text-emerald-700',
  inactive:    'text-zinc-500',
  blacklisted: 'text-red-600',
};
const TAX_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  vat:     { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'VAT' },
  non_vat: { bg: 'bg-zinc-100', text: 'text-zinc-600',  label: 'Non-VAT' },
};

function dateLabel(d: string | undefined | null): string {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function missingInfo(s: SupplierRow): string | null {
  if (!s.contactPerson) return 'No contact person';
  if (!s.contactNumber && !s.email) return 'No contact details';
  return null;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function SuppliersListPage() {
  usePageTitle('Suppliers');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = ([UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT] as string[]).includes(user?.role ?? '');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taxTypeFilter, setTaxTypeFilter] = useState('');
  const [sortValue, setSortValue] = useState('companyName:asc');

  const [sortField, sortOrder] = sortValue.split(':') as [string, 'asc' | 'desc'];

  const { data, isLoading } = useSuppliers({
    page,
    limit: 15,
    search: search || undefined,
    status: statusFilter || undefined,
    taxType: taxTypeFilter || undefined,
    sort: sortField,
    order: sortOrder,
  });

  const { data: statsRaw } = useSuppliersStats();
  const stats = statsRaw?.data;

  const updateSupplier = useUpdateSupplier();
  const suppliers = (data?.data ?? []) as SupplierRow[];
  const meta = data?.meta;

  const needsAttention = suppliers.filter((s) => missingInfo(s) && s.status === 'active');

  const [btnHover, setBtnHover] = useState(false);

  const hasFilters = !!search || !!statusFilter || !!taxTypeFilter;

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div
        className="pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: '0s' }}
      >
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900">
            Suppliers
          </h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">
            Vendor master records for procurement and finance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {stats && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600 tabular-nums">
                {stats.total} Total
              </span>
              {stats.active > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700 tabular-nums">
                  {stats.active} Active
                </span>
              )}
              {stats.blacklisted > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[12px] font-medium text-red-600 tabular-nums">
                  {stats.blacklisted} Blacklisted
                </span>
              )}
              {(stats.missingContact ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700 tabular-nums">
                  <AlertCircle className="h-3 w-3" />
                  {stats.missingContact} Needs Review
                </span>
              )}
            </>
          )}
          {canManage && (
            <button
              onClick={() => navigate('/suppliers/new')}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                background: btnHover
                  ? 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)'
                  : 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                boxShadow: btnHover
                  ? '0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)'
                  : '0 1px 3px rgba(0,0,0,0.15)',
                transform: btnHover ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New Supplier
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        style={{ animationDelay: '0.04s' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, TIN, or contact..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="peer h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>

            <select
              value={taxTypeFilter}
              onChange={(e) => { setTaxTypeFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">All Tax Types</option>
              <option value="vat">VAT</option>
              <option value="non_vat">Non-VAT</option>
            </select>

            <select
              value={sortValue}
              onChange={(e) => { setSortValue(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[13px] text-zinc-600 outline-none transition-colors duration-150 focus:border-zinc-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="companyName:asc">Name A → Z</option>
              <option value="companyName:desc">Name Z → A</option>
              <option value="createdAt:desc">Recently Added</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="updatedAt:desc">Recently Updated</option>
              <option value="status:asc">By Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div
        className="pr-list-section rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden"
        style={{ animationDelay: '0.08s' }}
      >
        {isLoading ? (
          <div className="space-y-1 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[56px] w-full rounded-lg" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 mb-5">
              <Building2 className="h-7 w-7 text-zinc-300" />
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">No suppliers found</h3>
            <p className="text-[13px] text-zinc-500 max-w-sm">
              {hasFilters
                ? 'Try adjusting your search or filters.'
                : 'Add your first supplier to get started.'}
            </p>
            {canManage && !hasFilters && (
              <button
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/suppliers/new')}
              >
                <Plus className="h-3.5 w-3.5" /> Add Supplier
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                  <tr className="border-b border-zinc-100">
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Supplier
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden md:table-cell">
                      Contact
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden lg:table-cell">
                      Category
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden lg:table-cell">
                      Tax / TIN
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Status
                    </th>
                    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hidden xl:table-cell">
                      Last Updated
                    </th>
                    <th className="h-11 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier, idx) => {
                    const missing = missingInfo(supplier);
                    const tax = TAX_CHIP[supplier.taxType];
                    return (
                      <tr
                        key={supplier._id}
                        className="pr-row-enter border-b border-zinc-100/60 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group"
                        style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
                        onClick={() => navigate(`/suppliers/${supplier._id}`)}
                      >
                        {/* Supplier */}
                        <td className="px-5 py-4">
                          <div className="max-w-[280px]">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-zinc-800 truncate group-hover:text-zinc-950 transition-colors duration-150">
                                {supplier.companyName}
                              </p>
                              {supplier.status === 'blacklisted' && (
                                <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                                  Blacklisted
                                </span>
                              )}
                              {missing && supplier.status === 'active' && (
                                <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" aria-label={missing ?? undefined} />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{supplier.address}</p>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          {supplier.contactPerson ? (
                            <div>
                              <p className="text-[13px] text-zinc-700 truncate max-w-[180px]">
                                {supplier.contactPerson}
                              </p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[180px]">
                                {supplier.contactNumber ?? supplier.email ?? '—'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[12px] text-zinc-300 italic">—</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          {supplier.category ? (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                              {supplier.category}
                            </span>
                          ) : (
                            <span className="text-[12px] text-zinc-300">—</span>
                          )}
                        </td>

                        {/* Tax / TIN */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="space-y-1">
                            {tax && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tax.bg} ${tax.text}`}>
                                {tax.label}
                              </span>
                            )}
                            <p className="text-[11px] text-zinc-400 font-mono">{supplier.tin}</p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[supplier.status] ?? 'bg-zinc-300'}`} />
                            <span className={`text-[12px] font-medium whitespace-nowrap ${STATUS_TEXT[supplier.status] ?? 'text-zinc-500'}`}>
                              {STATUS_LABEL[supplier.status] ?? supplier.status}
                            </span>
                          </div>
                        </td>

                        {/* Last Updated */}
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <span className="text-[12px] text-zinc-400 tabular-nums whitespace-nowrap">
                            {dateLabel(supplier.updatedAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all duration-150 focus:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-in fade-in-0 zoom-in-95"
                                align="end"
                                sideOffset={4}
                              >
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 outline-none hover:bg-zinc-50 transition-colors"
                                  onSelect={() => navigate(`/suppliers/${supplier._id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5 text-zinc-400" /> View Profile
                                </DropdownMenu.Item>
                                {canManage && (
                                  <>
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 outline-none hover:bg-zinc-50 transition-colors"
                                      onSelect={() => navigate(`/suppliers/${supplier._id}/edit`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-zinc-400" /> Edit
                                    </DropdownMenu.Item>
                                    {supplier.status === 'active' && (
                                      <>
                                        <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
                                        <DropdownMenu.Item
                                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-500 outline-none hover:bg-zinc-50 transition-colors"
                                          onSelect={() =>
                                            updateSupplier.mutate({ id: supplier._id, data: { status: 'inactive' } })
                                          }
                                        >
                                          <XCircle className="h-3.5 w-3.5 text-zinc-400" /> Disable
                                        </DropdownMenu.Item>
                                      </>
                                    )}
                                    {supplier.status === 'inactive' && (
                                      <>
                                        <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
                                        <DropdownMenu.Item
                                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-emerald-700 outline-none hover:bg-zinc-50 transition-colors"
                                          onSelect={() =>
                                            updateSupplier.mutate({ id: supplier._id, data: { status: 'active' } })
                                          }
                                        >
                                          <span className="h-3.5 w-3.5 flex items-center justify-center">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                          </span>
                                          Enable
                                        </DropdownMenu.Item>
                                      </>
                                    )}
                                  </>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ───────────────────────────────── */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                <p className="text-[12px] text-zinc-400 tabular-nums">
                  Page {meta.page} of {meta.totalPages}
                  <span className="text-zinc-300 mx-1.5">&middot;</span>
                  {meta.total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  {getPageNumbers(meta.page, meta.totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1.5 text-[12px] text-zinc-300">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`h-8 w-8 rounded-lg text-[12px] font-semibold transition-all duration-150 ${
                          p === meta.page
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= meta.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Attention Panel ──────────────────────────────────── */}
      {!isLoading && needsAttention.length > 0 && (
        <div
          className="pr-list-section rounded-xl border border-amber-100 bg-amber-50/50 px-5 py-4"
          style={{ animationDelay: '0.14s' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-amber-600">
              {needsAttention.length} Active Supplier{needsAttention.length !== 1 ? 's' : ''} Missing Contact Info
            </span>
          </div>
          <div className="space-y-2.5">
            {needsAttention.slice(0, 5).map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between cursor-pointer group/row"
                onClick={() => navigate(`/suppliers/${s._id}/edit`)}
              >
                <p className="text-[13px] font-medium text-zinc-800 truncate pr-4 group-hover/row:text-zinc-900 transition-colors">
                  {s.companyName}
                </p>
                <span className="text-[11px] text-amber-600 shrink-0 group-hover/row:text-amber-700 transition-colors">
                  {missingInfo(s)} →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
