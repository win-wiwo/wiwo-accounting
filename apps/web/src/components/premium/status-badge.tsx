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

/* Restrained semantic palette: gray=draft, blue=in-progress, amber=attention,
 * green=approved, red=rejected. Indigo/violet are remapped to blue to remove
 * playful purple saturation. */
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  gray:    'bg-zinc-50 text-zinc-500 border-zinc-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  indigo:  'bg-blue-50 text-blue-700 border-blue-200',
  violet:  'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn:    'bg-amber-50 text-amber-800 border-amber-200',
  amber:   'bg-amber-50 text-amber-800 border-amber-200',
  danger:  'bg-red-50 text-red-700 border-red-200',
  red:     'bg-red-50 text-red-700 border-red-200',
};

/* Borderless variant for secondary chips (e.g. priority next to status) */
const MUTED_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-50 text-zinc-700',
  gray:    'bg-zinc-50 text-zinc-500',
  info:    'bg-zinc-50 text-zinc-700',
  blue:    'bg-zinc-50 text-zinc-700',
  indigo:  'bg-zinc-50 text-zinc-700',
  violet:  'bg-zinc-50 text-zinc-700',
  success: 'bg-emerald-50/70 text-emerald-700',
  emerald: 'bg-emerald-50/70 text-emerald-700',
  warn:    'bg-amber-50/70 text-amber-800',
  amber:   'bg-amber-50/70 text-amber-800',
  danger:  'bg-red-50/70 text-red-700',
  red:     'bg-red-50/70 text-red-700',
};

const DOT: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-400',
  gray:    'bg-zinc-300',
  info:    'bg-blue-500',
  blue:    'bg-blue-500',
  indigo:  'bg-blue-500',
  violet:  'bg-blue-500',
  success: 'bg-emerald-500',
  emerald: 'bg-emerald-500',
  warn:    'bg-amber-500',
  amber:   'bg-amber-500',
  danger:  'bg-red-500',
  red:     'bg-red-500',
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Show a small colored dot before the label (premium tag style) */
  dot?: boolean;
  /** Borderless quieter variant — use for secondary chips like priority */
  muted?: boolean;
  children: React.ReactNode;
}

export function StatusBadge({
  tone = 'neutral',
  dot = false,
  muted = false,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-caption font-medium leading-none',
        muted ? MUTED_TONE[tone] : `border ${TONE[tone]}`,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT[tone])} />}
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
  level3_review:      'info',
  pending_quotation:  'info',
  quoted:             'info',
  approved:           'success',
  completed:          'success',
  rejected:           'danger',
  returned:           'warn',
};

export const prStatusTone = (status: string): BadgeTone =>
  PR_STATUS_TONE[status] ?? 'neutral';

const PR_PRIORITY_TONE: Record<string, BadgeTone> = {
  low:    'gray',
  medium: 'neutral',
  high:   'amber',
  urgent: 'red',
};

export const prPriorityTone = (priority: string): BadgeTone =>
  PR_PRIORITY_TONE[priority] ?? 'gray';
