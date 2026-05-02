import { cn } from '@/lib/utils';

interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fixed footer bar pinned to viewport bottom.
 *
 * Uses fixed positioning to sit flush at the very bottom of the screen.
 * Left offset and width account for the sidebar.
 */
export function StickyFooter({ children, className }: StickyFooterProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 z-20',
        'border-t border-zinc-200 bg-[#F6F7F9] px-6 lg:px-8 py-4 rounded-b-2xl',
        'shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
        className,
      )}
      style={{
        left: 'calc(var(--sidebar-w, 16rem) + 0.75rem)',
        right: '0.75rem',
        bottom: 0,
      }}
    >
      {children}
    </div>
  );
}
