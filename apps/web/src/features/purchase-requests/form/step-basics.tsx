import { Controller, type UseFormReturn } from 'react-hook-form';
import {
  Briefcase,
  Building2,
  FileText,
  Flag,
  ShoppingCart,
  Tag,
  Wrench,
} from 'lucide-react';

import {
  PR_PRIORITIES,
  PR_PRIORITY_LABELS,
  PrPriority,
} from '@prams/shared';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Surface,
  FormField,
  premiumSelectTriggerClass,
  premiumTextareaClass,
} from '@/components/premium';
import { cn } from '@/lib/utils';
import type { FormData, ProjectOption } from './schemas';

interface StepBasicsProps {
  form: UseFormReturn<FormData>;
  isEdit: boolean;
  projectOptions: ProjectOption[];
}

export function StepBasics({ form, isEdit, projectOptions }: StepBasicsProps) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;
  const requestType = watch('requestType');
  const assignmentType = watch('assignmentType');
  const selectedProjectId = watch('projectId');

  return (
    <div className="space-y-5">
      {/* ── Card 1 — Request Basics ───────────────────────── */}
      <Surface delay={0.04}>
        <PanelHeader
          icon={<FileText className="h-4 w-4 text-zinc-400" />}
          title="Request Basics"
          description="What you're requesting and what to call it."
        />
        <div className="px-6 pb-6 space-y-5">
          {!isEdit && (
            <FormField label="Request Type" className="pb-2">
              <Controller
                control={control}
                name="requestType"
                render={({ field }) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RequestTypeCard
                      selected={field.value === 'purchase_request'}
                      onClick={() => field.onChange('purchase_request')}
                      icon={<ShoppingCart className="h-4 w-4" />}
                      title="Purchase Request"
                      description="Buy goods, services, or procurement needs."
                    />
                    <RequestTypeCard
                      selected={field.value === 'job_request'}
                      onClick={() => field.onChange('job_request')}
                      icon={<Wrench className="h-4 w-4" />}
                      title="Job Request"
                      description="Request internal work or service tasks."
                    />
                  </div>
                )}
              />
            </FormField>
          )}

          <FormField
            label="Title"
            htmlFor="title"
            required
            error={errors.title?.message}
            help={
              requestType === 'job_request'
                ? 'Short, scannable name. e.g. "Electrical rewiring for Building A".'
                : 'Short, scannable name. e.g. "Busway Phase 2 Pole Hardware".'
            }
          >
            <Input
              id="title"
              placeholder={
                requestType === 'job_request'
                  ? 'e.g. Electrical rewiring for Building A'
                  : 'e.g. Busway Phase 2 Pole Hardware'
              }
              {...register('title')}
            />
          </FormField>
        </div>
      </Surface>

      {/* ── Card 2 — Assignment ───────────────────────────── */}
      <Surface delay={0.06}>
        <PanelHeader
          icon={<Tag className="h-4 w-4 text-zinc-400" />}
          title="Assignment"
          description="Tie this request to a specific project, or treat it as office overhead."
        />
        <div className="px-6 pb-6 space-y-4">
          <Controller
            control={control}
            name="assignmentType"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <AssignmentCard
                  selected={field.value === 'project'}
                  onClick={() => field.onChange('project')}
                  icon={<Briefcase className="h-4 w-4" />}
                  title="Project"
                  description="Attach to a specific project, budget, or initiative."
                />
                <AssignmentCard
                  selected={field.value === 'office'}
                  onClick={() => {
                    field.onChange('office');
                    setValue('projectId', '', { shouldValidate: true });
                  }}
                  icon={<Building2 className="h-4 w-4" />}
                  title="Office / General"
                  description="Overhead, shared resources, or non-project requests."
                />
              </div>
            )}
          />

          {assignmentType === 'project' ? (
            <FormField error={errors.projectId?.message}>
              <Select
                key={`${selectedProjectId || 'none'}:${projectOptions.length}`}
                value={selectedProjectId || ''}
                onValueChange={(v) =>
                  setValue('projectId', v, { shouldValidate: true })
                }
              >
                <SelectTrigger className={premiumSelectTriggerClass}>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={String(p._id)} value={String(p._id)}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-3 text-[12px] text-zinc-500 leading-relaxed">
              Not tied to a project — recorded as a general office or overhead
              expense.
            </div>
          )}
        </div>
      </Surface>

      {/* ── Card 3 — Priority & Required Date ─────────────── */}
      <Surface delay={0.08}>
        <PanelHeader
          icon={<Flag className="h-4 w-4 text-zinc-400" />}
          title="Priority & Required Date"
          description="How urgent it is, and when it's needed by."
        />
        <div className="px-6 pb-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Priority" error={errors.priority?.message}>
              <Select
                value={watch('priority')}
                onValueChange={(v) =>
                  setValue('priority', v as PrPriority, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className={premiumSelectTriggerClass}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PR_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PR_PRIORITY_LABELS[p as PrPriority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Required Date" htmlFor="neededByDate">
              <Controller
                control={control}
                name="neededByDate"
                render={({ field }) => (
                  <DatePicker
                    id="neededByDate"
                    value={field.value || ''}
                    onChange={field.onChange}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder="Select date..."
                  />
                )}
              />
            </FormField>
          </div>
        </div>
      </Surface>

      {/* ── Card 4 — Purpose ──────────────────────────────── */}
      <Surface delay={0.1}>
        <PanelHeader
          icon={<FileText className="h-4 w-4 text-zinc-400" />}
          title="Purpose"
          description="Approvers read this to decide. Be specific about what operation or project work this supports."
        />
        <div className="px-6 pb-6">
          <FormField
            htmlFor="justification"
            required
            error={errors.justification?.message}
          >
            <textarea
              id="justification"
              rows={4}
              className={premiumTextareaClass}
              placeholder="Explain what this PR supports — system, project phase, deadline, downtime risk, etc."
              {...register('justification')}
            />
          </FormField>
        </div>
      </Surface>
    </div>
  );
}

/* ── Request Type card ─────────────────────────────────────
 * Two horizontal selectable cards used in place of the segmented
 * control. Selected state uses a softer dark-gray border, a faint
 * tint, and a subtle lifted shadow; unselected stays clean white.
 */
interface RequestTypeCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RequestTypeCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: RequestTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2',
        selected
          ? 'border-zinc-800/85 bg-zinc-50/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_12px_rgba(0,0,0,0.04)]'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          selected
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200/80',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-900 leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">
          {description}
        </p>
      </div>
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
          selected
            ? 'bg-zinc-800'
            : 'border border-zinc-300 bg-white group-hover:border-zinc-400',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

/* ── Assignment card — horizontal layout, compact ────────────────────────
 * Matches RequestTypeCard design language but uses a side-by-side layout
 * (icon left, text right) for the tighter Assignment section context.
 */
interface AssignmentCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function AssignmentCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: AssignmentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2',
        selected
          ? 'border-zinc-800/85 bg-zinc-50/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_12px_rgba(0,0,0,0.04)]'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          selected
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200/80',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-900 leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">
          {description}
        </p>
      </div>
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
          selected
            ? 'bg-zinc-800'
            : 'border border-zinc-300 bg-white group-hover:border-zinc-400',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

function PanelHeader({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
        {icon}
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
