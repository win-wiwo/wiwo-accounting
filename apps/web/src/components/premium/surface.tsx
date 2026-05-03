import * as React from 'react';
import { cn } from '@/lib/utils';

type Elevation = 'flat' | 'subtle' | 'default' | 'raised';

const ELEVATION: Record<Elevation, string> = {
  flat:    '',
  subtle:  'shadow-card',
  default: 'shadow-card-hover',
  raised:  'shadow-card-raised',
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
