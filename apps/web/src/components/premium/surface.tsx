import * as React from 'react';
import { cn } from '@/lib/utils';

type Elevation = 'flat' | 'subtle' | 'default' | 'raised';

const ELEVATION: Record<Elevation, string> = {
  flat:    '',
  subtle:  'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
  default: 'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]',
  raised:  'shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.05)]',
};

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  /** When provided, the surface fades in with the standard pr-list-section animation. */
  delay?: number;
  asChild?: boolean;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation = 'default', delay, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{ ...style, ...(delay !== undefined ? { animationDelay: `${delay}s` } : {}) }}
      className={cn(
        'rounded-xl border border-zinc-200/80 bg-white overflow-hidden',
        ELEVATION[elevation],
        delay !== undefined && 'pr-list-section',
        className,
      )}
      {...props}
    />
  ),
);
Surface.displayName = 'Surface';
