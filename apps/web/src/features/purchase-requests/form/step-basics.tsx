import { Controller, type UseFormReturn } from 'react-hook-form';
import { Briefcase, Building2 } from 'lucide-react';
import {
  PR_PRIORITIES,
  PR_PRIORITY_LABELS,
  PrPriority,
} from '@prams/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Surface,
  FormField,
  premiumSelectTriggerClass,
  premiumTextareaClass,
} from '@/components/premium';
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
    <div className="space-y-6">
      {/* Request Type — create mode only */}
      {!isEdit && (
        <Surface delay={0.04}>
          <div className="px-6 py-5">
            <FormField label="Request Type">
              <Controller
                control={control}
                name="requestType"
                render={({ field }) => (
                  <SegmentedControl
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'purchase_request' as const, label: 'Purchase Request (PR)' },
                      { value: 'job_request' as const, label: 'Job Request (JR)' },
                    ]}
                  />
                )}
              />
            </FormField>
          </div>
        </Surface>
      )}

      <Surface delay={isEdit ? 0.04 : 0.06}>
        <div className="px-6 py-6 space-y-5">
          {/* Assignment */}
          <FormField label="Assign to">
            <div className="space-y-3">
              <Controller
                control={control}
                name="assignmentType"
                render={({ field }) => (
                  <SegmentedControl
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      if (v === 'office')
                        setValue('projectId', '', { shouldValidate: true });
                    }}
                    options={[
                      {
                        value: 'project' as const,
                        label: 'Project',
                        icon: <Briefcase className="h-3.5 w-3.5" />,
                      },
                      {
                        value: 'office' as const,
                        label: 'Office / General',
                        icon: <Building2 className="h-3.5 w-3.5" />,
                      },
                    ]}
                  />
                )}
              />

              {assignmentType === 'project' ? (
                <div>
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
                  {errors.projectId && (
                    <p className="mt-1 text-[12px] text-red-600">
                      {errors.projectId.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 px-3 py-2 text-[12px] text-zinc-500">
                  Not tied to a project — general office or overhead expense.
                </div>
              )}
            </div>
          </FormField>

          {/* Priority + Required Date */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Priority" error={errors.priority?.message}>
              <Select
                value={watch('priority')}
                onValueChange={(v) =>
                  setValue('priority', v as PrPriority, { shouldValidate: true })
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
              <Input id="neededByDate" type="date" {...register('neededByDate')} />
            </FormField>
          </div>

          {/* Title */}
          <FormField
            label="Title"
            htmlFor="title"
            required
            error={errors.title?.message}
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

          {/* Purpose */}
          <FormField
            label="Purpose"
            htmlFor="justification"
            required
            error={errors.justification?.message}
          >
            <textarea
              id="justification"
              rows={3}
              className={premiumTextareaClass}
              placeholder="Explain the purpose — what operations or project work this supports..."
              {...register('justification')}
            />
          </FormField>
        </div>
      </Surface>
    </div>
  );
}
