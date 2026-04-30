import { type UseFormReturn } from 'react-hook-form';
import {
  CheckCircle2,
  Circle,
  Lightbulb,
  ShoppingCart,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { SourcingType } from '@prams/shared';
import { Surface } from '@/components/premium';
import { cn } from '@/lib/utils';
import type { FormData } from './schemas';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(n);
}

/* ── Shared bits ──────────────────────────────────────────── */

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </p>
  );
}

/* ── Approval flow (used on Step 1 + 3) ───────────────────── */

const APPROVAL_FLOW = [
  'Submit request',
  'Department review',
  'Procurement if needed',
  'Final approval',
] as const;

function ApprovalFlow() {
  return (
    <Surface elevation="subtle">
      <div className="p-6">
        <PanelLabel>Approval flow</PanelLabel>
        <ol className="mt-4 space-y-3">
          {APPROVAL_FLOW.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600 tabular-nums">
                {i + 1}
              </span>
              <span className="text-[13px] font-medium text-zinc-800 leading-6">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
}

/* ── Step 1 — Completion Checklist ────────────────────────── */

interface CompletionChecklistProps {
  form: UseFormReturn<FormData>;
}

function CompletionChecklist({ form }: CompletionChecklistProps) {
  const title = form.watch('title');
  const assignmentType = form.watch('assignmentType');
  const projectId = form.watch('projectId');
  const priority = form.watch('priority');
  const justification = form.watch('justification');

  const items = [
    {
      label: 'Title',
      done: !!title?.trim(),
    },
    {
      label: 'Assignment',
      done:
        assignmentType === 'office' ||
        (assignmentType === 'project' && !!projectId),
    },
    {
      label: 'Priority',
      done: !!priority,
    },
    {
      label: 'Purpose',
      done: !!justification?.trim() && justification.trim().length > 0,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  return (
    <Surface elevation="subtle">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <PanelLabel>Completion</PanelLabel>
          <span className="text-[11px] font-semibold tabular-nums text-zinc-500">
            {completedCount} / {items.length}
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2.5">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-300" />
              )}
              <span
                className={cn(
                  'text-[13px] leading-6 transition-colors',
                  item.done
                    ? 'font-medium text-zinc-800'
                    : 'text-zinc-500',
                )}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}

/* ── Step 1 — Tips ────────────────────────────────────────── */

function BasicsTips() {
  return (
    <Surface elevation="subtle">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <PanelLabel>Tips</PanelLabel>
        </div>
        <ul className="mt-3 space-y-2 text-[12px] text-zinc-600 leading-relaxed">
          <li>
            <span className="text-zinc-400">›</span> Pick the right{' '}
            <span className="font-medium text-zinc-800">priority</span> — Urgent
            requests are sorted to the top of approvers' queues.
          </li>
          <li>
            <span className="text-zinc-400">›</span> The{' '}
            <span className="font-medium text-zinc-800">purpose</span> is read by
            approvers — be specific about what work this supports.
          </li>
          <li>
            <span className="text-zinc-400">›</span> If unsure about a project,
            choose <span className="font-medium text-zinc-800">Office / General</span>.
          </li>
        </ul>
      </div>
    </Surface>
  );
}

/* ── Step 2 — Running Totals ──────────────────────────────── */

interface RunningTotalsProps {
  totalAmount: number;
  itemCount: number;
  sourcingMode: SourcingType;
}

function RunningTotals({
  totalAmount,
  itemCount,
  sourcingMode,
}: RunningTotalsProps) {
  const isProcurement = sourcingMode === SourcingType.PROCUREMENT;
  return (
    <Surface elevation="subtle">
      <div className="p-5">
        <PanelLabel>{isProcurement ? 'Pricing' : 'Total amount'}</PanelLabel>
        {isProcurement ? (
          <p className="mt-1.5 text-[24px] font-bold text-amber-600 leading-none">
            TBQ
          </p>
        ) : (
          <p className="mt-1.5 text-[32px] font-bold text-zinc-900 tabular-nums leading-none">
            {formatCurrency(totalAmount)}
          </p>
        )}
        {isProcurement && (
          <p className="mt-1.5 text-[11px] text-amber-600 leading-relaxed">
            Final pricing determined after procurement canvasses suppliers.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Items
            </p>
            <p className="mt-1 text-[18px] font-bold text-zinc-900 tabular-nums leading-none">
              {itemCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Sourcing
            </p>
            <span className={cn(
              'mt-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              isProcurement
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-blue-50 border-blue-100 text-blue-700',
            )}>
              {isProcurement ? 'Procurement' : 'Online'}
            </span>
          </div>
        </div>
      </div>
    </Surface>
  );
}

/* ── Step 2 — Supplier Completeness ───────────────────────── */

interface SupplierCompletenessProps {
  items: FormData['items'];
}

function SupplierCompleteness({ items }: SupplierCompletenessProps) {
  const onlineItems = items.filter(
    (i) => i.sourcingType === SourcingType.ONLINE,
  );
  if (onlineItems.length === 0) {
    return (
      <Surface elevation="subtle">
        <div className="p-5">
          <PanelLabel>Supplier references</PanelLabel>
          <div className="mt-3 flex items-start gap-2 text-[12px] text-zinc-500 leading-relaxed">
            <ShoppingCart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span>Procurement-only — suppliers sourced by Procurement after approval.</span>
          </div>
        </div>
      </Surface>
    );
  }

  const totalRequired = onlineItems.length * 3;
  const totalProvided = onlineItems.reduce(
    (sum, item) => sum + (item.sellerReferences?.length ?? 0),
    0,
  );
  const itemsNeedingJustification = onlineItems.filter(
    (item) =>
      (item.sellerReferences?.length ?? 0) < 3 &&
      !item.sellerReferencesJustification?.trim(),
  ).length;

  const percent = Math.min(100, Math.round((totalProvided / totalRequired) * 100));

  return (
    <Surface elevation="subtle">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <PanelLabel>Supplier references</PanelLabel>
          <span
            className={cn(
              'text-[11px] font-bold tabular-nums',
              totalProvided >= totalRequired ? 'text-emerald-600' : 'text-zinc-500',
            )}
          >
            {totalProvided}/{totalRequired}
          </span>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-zinc-700' : 'bg-amber-500',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Per-item breakdown */}
        <ul className="mt-3 space-y-1.5">
          {onlineItems.slice(0, 4).map((item, i) => {
            const count = item.sellerReferences?.length ?? 0;
            const originalIndex = items.indexOf(item);
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-600 tabular-nums">
                  {originalIndex + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-zinc-600 truncate">
                      {item.description || `Item ${originalIndex + 1}`}
                    </p>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-bold tabular-nums',
                        count >= 3 ? 'text-emerald-600' : 'text-amber-600',
                      )}
                    >
                      {count}/3
                    </span>
                  </div>
                  <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        count >= 3 ? 'bg-emerald-500' : 'bg-amber-400',
                      )}
                      style={{ width: `${Math.min(100, (count / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
          {onlineItems.length > 4 && (
            <li className="text-[10px] text-zinc-400 pl-6">
              +{onlineItems.length - 4} more items
            </li>
          )}
        </ul>

        {itemsNeedingJustification > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-700 leading-relaxed">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {itemsNeedingJustification}{' '}
              {itemsNeedingJustification === 1 ? 'item needs' : 'items need'}{' '}
              justification for fewer than 3 sellers.
            </span>
          </div>
        )}
      </div>
    </Surface>
  );
}

/* ── Step 2 — Reminders ───────────────────────────────────── */

function ItemsReminders() {
  return (
    <Surface elevation="subtle">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <PanelLabel>Tips</PanelLabel>
        </div>
        <ul className="mt-3 space-y-2 text-[12px] text-zinc-600 leading-relaxed">
          <li>
            <span className="text-zinc-400">›</span> Add detailed{' '}
            <span className="font-medium text-zinc-800">specs</span> — model, brand, dimensions — so Procurement can canvass immediately.
          </li>
          <li>
            <span className="text-zinc-400">›</span> A{' '}
            <span className="font-medium text-zinc-800">reference photo</span>{' '}
            prevents back-and-forth on every item.
          </li>
        </ul>
      </div>
    </Surface>
  );
}

/* ── Wrapper ──────────────────────────────────────────────── */

interface ContextualPanelProps {
  step: number;
  form: UseFormReturn<FormData>;
  totalAmount: number;
}

export function ContextualPanel({
  step,
  form,
  totalAmount,
}: ContextualPanelProps) {
  if (step === 0) {
    return (
      <div className="space-y-4">
        <ApprovalFlow />
        <CompletionChecklist form={form} />
        <BasicsTips />
      </div>
    );
  }

  if (step === 1) {
    const items = form.watch('items') ?? [];
    const sourcingMode = (form.watch('sourcingMode') ?? SourcingType.PROCUREMENT) as SourcingType;

    return (
      <div className="space-y-4">
        <RunningTotals
          totalAmount={totalAmount}
          itemCount={items.length}
          sourcingMode={sourcingMode}
        />
        <SupplierCompleteness items={items} />
        <ItemsReminders />
      </div>
    );
  }

  // Step 2 (Review)
  return (
    <div className="space-y-4">
      <ApprovalFlow />
    </div>
  );
}
