import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function FilterBar({ delay, className, children }: FilterBarProps) {
  return (
    <div
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
      className={cn(
        'rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-card',
        delay !== undefined && 'pr-list-section',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {children}
      </div>
    </div>
  );
}

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none transition-colors duration-200" />
      <input
        ref={ref}
        type="text"
        {...props}
        className={cn(
          'peer w-full h-10 rounded-xl border border-zinc-200/80 bg-zinc-50/40 pl-10 pr-4 text-body text-zinc-700 shadow-xs placeholder:text-zinc-400 outline-none transition-all duration-200',
          'hover:border-zinc-300 hover:bg-zinc-50/80',
          'focus:border-zinc-400 focus:bg-white focus:shadow-focus',
          className,
        )}
      />
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';

/**
 * Apply this className to a `<SelectTrigger>` to match the premium FilterBar
 * select styling. Use `cn(premiumSelectTriggerClass, 'w-[154px]')` to size.
 *
 * Note: The base SelectTrigger already ships premium styling.
 * This class only adds context-specific overrides for filter bars.
 */
export const premiumSelectTriggerClass =
  'text-zinc-600';

interface FilterControlsProps {
  children: React.ReactNode;
  className?: string;
}

/** Right-side group for filter selects in a FilterBar. */
export function FilterControls({ children, className }: FilterControlsProps) {
  return (
    <div className={cn('flex gap-2 flex-wrap sm:flex-nowrap shrink-0', className)}>
      {children}
    </div>
  );
}
