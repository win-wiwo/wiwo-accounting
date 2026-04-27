import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  rows?: number;
  /** Tailwind height utility for each row, e.g. `h-[52px]` (default) or `h-16`. */
  rowHeight?: string;
  className?: string;
}

/**
 * Standard loading placeholder for a tabular `<Surface>` body. Use in place
 * of the table while data is loading.
 */
export function ListSkeleton({
  rows = 6,
  rowHeight = 'h-[52px]',
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-1 p-6', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn(rowHeight, 'w-full rounded-lg')} />
      ))}
    </div>
  );
}
