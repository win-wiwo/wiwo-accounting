import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'neutral'
  | 'gray'
  | 'info'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'success'
  | 'emerald'
  | 'warn'
  | 'amber'
  | 'danger'
  | 'red';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-600',
  gray:    'bg-zinc-100 text-zinc-500',
  info:    'bg-blue-50 text-blue-700',
  blue:    'bg-blue-50 text-blue-600',
  indigo:  'bg-indigo-50 text-indigo-700',
  violet:  'bg-violet-50 text-violet-700',
  success: 'bg-emerald-50 text-emerald-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  warn:    'bg-amber-50 text-amber-700',
  amber:   'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-600',
  red:     'bg-red-50 text-red-600',
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: React.ReactNode;
}

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Domain helpers ──────────────────────────────────────
 * Map common PRAMS enum strings to a badge tone. Pages can opt in to these
 * helpers so the same value always shows the same color.
 */
const PR_STATUS_TONE: Record<string, BadgeTone> = {
  draft:              'neutral',
  submitted:          'info',
  level1_review:      'info',
  level2_review:      'info',
  level3_review:      'indigo',
  pending_quotation:  'violet',
  quoted:             'violet',
  approved:           'success',
  completed:          'success',
  rejected:           'danger',
  returned:           'warn',
  returned_for_info:  'warn',
};

export const prStatusTone = (status: string): BadgeTone =>
  PR_STATUS_TONE[status] ?? 'neutral';

const PR_PRIORITY_TONE: Record<string, BadgeTone> = {
  low:    'gray',
  medium: 'blue',
  high:   'amber',
  urgent: 'red',
};

export const prPriorityTone = (priority: string): BadgeTone =>
  PR_PRIORITY_TONE[priority] ?? 'gray';
