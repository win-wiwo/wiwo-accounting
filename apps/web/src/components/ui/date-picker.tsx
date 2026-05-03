import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '@/lib/utils';

/** Parse YYYY-MM-DD to Date (returns undefined if invalid) */
function parseDate(str: string | undefined): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return !isNaN(date.getTime()) ? date : undefined;
}

/** Format Date to YYYY-MM-DD */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format Date for display: "Apr 27, 2026" */
function formatDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DatePickerProps {
  /** Value as YYYY-MM-DD string (matches native input[type=date]) */
  value?: string;
  onChange?: (value: string) => void;
  /** Minimum selectable date as YYYY-MM-DD */
  min?: string;
  /** Maximum selectable date as YYYY-MM-DD */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    { value, onChange, min, max, placeholder = 'Pick a date', disabled, className, id, name },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => parseDate(value), [value]);

    const disabledMatcher = React.useMemo(() => {
      const matchers: Array<{ before?: Date; after?: Date }> = [];
      const minDate = parseDate(min);
      if (minDate) matchers.push({ before: minDate });
      const maxDate = parseDate(max);
      if (maxDate) matchers.push({ after: maxDate });
      return matchers.length > 0 ? matchers : undefined;
    }, [min, max]);

    const handleSelect = (day: Date | undefined) => {
      if (day) {
        onChange?.(toISODate(day));
      }
      setOpen(false);
    };

    const handleClear = () => {
      onChange?.('');
      setOpen(false);
    };

    const handleToday = () => {
      onChange?.(toISODate(new Date()));
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3.5 py-2 text-left text-[13px]',
              'shadow-xs transition-all duration-200',
              'hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-card',
              'focus:outline-none focus:border-zinc-300 focus:bg-white focus:shadow-focus',
              'disabled:cursor-not-allowed disabled:opacity-50',
              open && 'border-zinc-300 bg-white shadow-focus',
              className,
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            {selectedDate ? (
              <span className="text-zinc-700">{formatDisplay(selectedDate)}</span>
            ) : (
              <span className="text-zinc-400">{placeholder}</span>
            )}
            {name && <input type="hidden" name={name} value={value || ''} />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto min-w-[296px] p-0 shadow-popover border-zinc-200/80"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            disabled={disabledMatcher}
            autoFocus
          />
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-2 py-1 text-[12px] font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-600 hover:bg-zinc-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-md px-2.5 py-1 text-[12px] font-medium text-zinc-600 transition-colors duration-150 hover:text-zinc-900 hover:bg-zinc-50"
            >
              Today
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = 'DatePicker';

export { DatePicker };
