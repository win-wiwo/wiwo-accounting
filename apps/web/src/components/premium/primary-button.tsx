import * as React from 'react';
import { cn } from '@/lib/utils';

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cn(
        'premium-primary-btn',
        'inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-white cursor-pointer',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2',
        className,
      )}
    />
  ),
);
PrimaryButton.displayName = 'PrimaryButton';

type GhostButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const GhostButton = React.forwardRef<HTMLButtonElement, GhostButtonProps>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-medium text-zinc-700 cursor-pointer',
        'border border-zinc-200 bg-white',
        'transition-all duration-200',
        'hover:bg-zinc-50 hover:border-zinc-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2',
        className,
      )}
    />
  ),
);
GhostButton.displayName = 'GhostButton';
