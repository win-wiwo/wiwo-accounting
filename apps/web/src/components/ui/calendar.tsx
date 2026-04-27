import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-3',
        month_caption: 'flex items-center justify-center h-8 relative',
        caption_label: 'text-[13px] font-semibold text-zinc-800',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/60 bg-white text-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
        button_next:
          'absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/60 bg-white text-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-zinc-50 hover:text-zinc-700 hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
        weekdays: 'flex',
        weekday:
          'w-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 text-center',
        week: 'flex mt-0.5',
        day: 'relative p-0 text-center',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] text-zinc-700 transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
        selected:
          '[&>.rdp-day_button]:bg-zinc-900 [&>.rdp-day_button]:text-white [&>.rdp-day_button]:font-medium [&>.rdp-day_button]:hover:bg-zinc-800 [&>.rdp-day_button]:shadow-[0_1px_3px_rgba(0,0,0,0.2)]',
        today:
          '[&>.rdp-day_button]:font-bold [&>.rdp-day_button]:text-zinc-900 [&>.rdp-day_button]:ring-1 [&>.rdp-day_button]:ring-zinc-300',
        outside:
          '[&>.rdp-day_button]:text-zinc-300 [&>.rdp-day_button]:hover:text-zinc-500',
        disabled:
          '[&>.rdp-day_button]:text-zinc-200 [&>.rdp-day_button]:pointer-events-none [&>.rdp-day_button]:hover:bg-transparent',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
