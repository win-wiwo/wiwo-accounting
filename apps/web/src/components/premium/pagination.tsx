import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Premium pagination footer used inside a `<Surface>` table container.
 * Renders nothing when there is only one page.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-zinc-100 px-5 py-3',
        className,
      )}
    >
      <p className="text-[12px] text-zinc-400 tabular-nums">
        Page {page} of {totalPages}
        <span className="text-zinc-300 mx-1.5">&middot;</span>
        {total} total
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span
              key={`dots-${i}`}
              className="px-1.5 text-[12px] text-zinc-300"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={cn(
                'h-8 w-8 rounded-lg text-[12px] font-semibold transition-all duration-150',
                p === page
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2)
    return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
