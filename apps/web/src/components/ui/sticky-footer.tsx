import { cn } from '@/lib/utils';

interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyFooter({ children, className }: StickyFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-6 border-t bg-background/80 backdrop-blur-sm px-6 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
