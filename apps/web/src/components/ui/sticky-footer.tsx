import { cn } from '@/lib/utils';

interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-width sticky footer bar.
 *
 * Width is computed as: 100vw − sidebar width (CSS var set by AppLayout) − 2×p-3 outer padding.
 * This is the only reliable approach for "bleed to card edges" inside a deeply nested flex tree.
 *
 * Shift: -ml-6 (lg:-ml-8) moves the bar left to cancel the p-6/p-8 inner padding.
 */
export function StickyFooter({ children, className }: StickyFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 -ml-6 lg:-ml-8',
        'border-t border-zinc-200 bg-white/95 px-6 lg:px-8 py-4 backdrop-blur-md',
        'shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
        className,
      )}
      style={{
        // card width = 100vw - sidebar - 2×p-3(0.75rem each side)
        width: 'calc(100vw - var(--sidebar-w, 16rem) - 2.5rem)',
      }}
    >
      {children}
    </div>
  );
}
