import { cn } from '@/lib/utils';

export type IconTone = 'neutral' | 'success' | 'warn' | 'info' | 'danger';

const ICON_TONE: Record<IconTone, string> = {
  neutral: 'bg-zinc-100 [&>svg]:text-zinc-400',
  success: 'bg-emerald-50 [&>svg]:text-emerald-500',
  warn:    'bg-amber-50 [&>svg]:text-amber-500',
  info:    'bg-blue-50 [&>svg]:text-blue-500',
  danger:  'bg-red-50 [&>svg]:text-red-500',
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  iconTone?: IconTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Premium empty state used inside a `<Surface>` body. The icon is auto-sized
 * to 28px and tinted by `iconTone`; consumers just pass a lucide icon.
 */
export function EmptyState({
  icon,
  iconTone = 'neutral',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl mb-5 [&>svg]:h-7 [&>svg]:w-7',
            ICON_TONE[iconTone],
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-zinc-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-[13px] text-zinc-500 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
