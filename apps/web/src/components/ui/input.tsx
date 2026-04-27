import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3.5 py-2 text-[13px] text-zinc-700',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200',
          'file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-zinc-700',
          'placeholder:text-zinc-400',
          'hover:border-zinc-300 hover:bg-zinc-50/80',
          'focus-visible:outline-none focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Date input specific — improve native calendar icon
          type === 'date' && [
            '[&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            '[&::-webkit-calendar-picker-indicator]:hover:opacity-100',
            '[&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:duration-200',
          ],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
