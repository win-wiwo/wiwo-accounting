import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
  delay = 0,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'pr-list-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div>
        <h1 className="text-display font-bold tracking-[-0.01em] leading-tight text-zinc-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-body-lg text-zinc-500">{description}</p>
        )}
      </div>
      {(meta || actions) && (
        <div className="flex items-center gap-4">
          {meta && (
            <div className="hidden sm:flex items-center gap-2">{meta}</div>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

export type MetricPillTone =
  | 'default'
  | 'muted'
  | 'info'
  | 'warn'
  | 'danger'
  | 'success';

const PILL_TONE: Record<MetricPillTone, string> = {
  default: 'bg-zinc-100 text-zinc-600',
  muted:   'bg-zinc-100 text-zinc-500',
  info:    'bg-blue-50 text-blue-600',
  warn:    'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-600',
  success: 'bg-emerald-50 text-emerald-700',
};

interface MetricPillProps {
  children: React.ReactNode;
  tone?: MetricPillTone;
  className?: string;
}

export function MetricPill({ children, tone = 'default', className }: MetricPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label font-medium tabular-nums',
        PILL_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
