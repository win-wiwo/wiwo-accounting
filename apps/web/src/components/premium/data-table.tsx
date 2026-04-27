import * as React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Align = 'left' | 'right' | 'center';

const alignClass = (align?: Align) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

export const DataTable = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, children, ...props }, ref) => (
  <div className="overflow-x-auto">
    <table ref={ref} className={cn('w-full', className)} {...props}>
      {children}
    </table>
  </div>
));
DataTable.displayName = 'DataTable';

interface DataTableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Wraps children in a single header `<tr>`. Pass `<DataTh>` cells as children. */
}

export function DataTableHead({ className, children, ...props }: DataTableHeadProps) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-white/95 backdrop-blur-sm', className)}
      {...props}
    >
      <tr className="border-b border-zinc-100">{children}</tr>
    </thead>
  );
}

interface DataThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
}

export function DataTh({ className, align, children, ...props }: DataThProps) {
  return (
    <th
      {...props}
      className={cn(
        'h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400',
        alignClass(align),
        className,
      )}
    >
      {children}
    </th>
  );
}

interface SortableHeaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

/** Wrap header label text with this to render a clickable sort affordance. */
export function SortableHeader({ className, children, active, ...props }: SortableHeaderProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1 cursor-pointer select-none transition-colors duration-150',
        active ? 'text-zinc-700' : 'hover:text-zinc-600',
        className,
      )}
    >
      {children}
      <ArrowUpDown className={cn('h-3 w-3', active ? 'opacity-70' : 'opacity-40')} />
    </span>
  );
}

export const DataTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props} />
));
DataTableBody.displayName = 'DataTableBody';

interface DataRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** When provided, applies the standard staggered fade-in (0.04s + index * 0.025s). */
  index?: number;
}

export const DataRow = React.forwardRef<HTMLTableRowElement, DataRowProps>(
  ({ className, index, style, onClick, ...props }, ref) => (
    <tr
      ref={ref}
      onClick={onClick}
      style={{
        ...style,
        ...(index !== undefined ? { animationDelay: `${0.04 + index * 0.025}s` } : {}),
      }}
      className={cn(
        'pr-row-enter border-b border-zinc-100/60 last:border-0 transition-all duration-150 hover:bg-zinc-50/80 group',
        onClick && 'cursor-pointer',
        className,
      )}
      {...props}
    />
  ),
);
DataRow.displayName = 'DataRow';

interface DataCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
}

export function DataCell({ className, align, children, ...props }: DataCellProps) {
  return (
    <td
      {...props}
      className={cn('px-5 py-4', alignClass(align), className)}
    >
      {children}
    </td>
  );
}
