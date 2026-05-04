import * as React from 'react';
import { DayPicker, useDayPicker, type DayPickerProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Inline [← Month Year →] header rendered inside the caption row */
function InlineMonthCaption({
  calendarMonth,
}: {
  calendarMonth: { date: Date };
  displayIndex?: number;
}) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();

  const label = calendarMonth.date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between px-0.5">
      <button
        type="button"
        aria-label="Go to previous month"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400',
          'transition-all duration-150',
          'hover:bg-zinc-100 hover:text-zinc-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
          'disabled:pointer-events-none disabled:opacity-25',
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <span className="select-none text-xs font-semibold tracking-[-0.01em] text-zinc-800">
        {label}
      </span>

      <button
        type="button"
        aria-label="Go to next month"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400',
          'transition-all duration-150',
          'hover:bg-zinc-100 hover:text-zinc-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
          'disabled:pointer-events-none disabled:opacity-25',
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      weekStartsOn={0}
      showOutsideDays={showOutsideDays}
      className={cn('p-3.5', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-3',
        month_caption: 'flex items-center h-8',
        caption_label: 'hidden',
        nav: 'hidden',
        weekdays: 'flex mt-1',
        weekday:
          'w-9 text-micro font-semibold uppercase tracking-widest text-zinc-400/90 text-center pb-1.5',
        week: 'flex mt-0.5',
        // w-9 matches weekday header width — required for column alignment in flex rows
        day: 'relative p-0 text-center w-9',
        // rdp v9 passes className directly to the <button> element (no rdp-day_button class)
        day_button: cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full',
          'text-xs font-normal text-zinc-700',
          'transition-all duration-150',
          'hover:bg-zinc-100 hover:text-zinc-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
        ),
        // Modifier classes apply to the <td> (Day component); target its <button> child with [&>button]
        selected: [
          '[&>button]:bg-zinc-900',
          '[&>button]:text-white',
          '[&>button]:font-semibold',
          '[&>button]:shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
          '[&>button]:hover:bg-zinc-800',
          '[&>button]:hover:text-white',
        ].join(' '),
        today: [
          '[&>button]:font-semibold',
          '[&>button]:text-zinc-900',
          '[&>button]:ring-1',
          '[&>button]:ring-zinc-300/80',
        ].join(' '),
        outside: [
          '[&>button]:text-zinc-400',
          '[&>button]:hover:text-zinc-500',
          '[&>button]:hover:bg-zinc-50',
        ].join(' '),
        disabled: [
          // opacity makes the whole cell visibly muted — clearly unclickable
          '[&>button]:opacity-30',
          '[&>button]:cursor-not-allowed',
          '[&>button]:hover:bg-transparent',
          '[&>button]:hover:text-zinc-700',
        ].join(' '),
        // invisible keeps the cell in the flex layout (takes space) without showing content
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        MonthCaption: InlineMonthCaption as any,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
