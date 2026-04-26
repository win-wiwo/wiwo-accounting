import { Controller, type UseFormReturn } from 'react-hook-form';
import { PR_PRIORITIES, PR_PRIORITY_LABELS, PrPriority } from '@prams/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Briefcase, Building2 } from 'lucide-react';
import type { FormData, ProjectOption } from './schemas';

interface StepBasicsProps {
  form: UseFormReturn<FormData>;
  isEdit: boolean;
  projectOptions: ProjectOption[];
}

export function StepBasics({ form, isEdit, projectOptions }: StepBasicsProps) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const requestType = watch('requestType');
  const assignmentType = watch('assignmentType');
  const selectedProjectId = watch('projectId');

  return (
    <div className="space-y-6">
      {/* Request Type — create mode only */}
      {!isEdit && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Request Type</Label>
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
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Assignment — "Project vs Office/General" */}
          <div className="space-y-3">
            <Label>Assign to</Label>
            <Controller
              control={control}
              name="assignmentType"
              render={({ field }) => (
                <SegmentedControl
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v === 'office') setValue('projectId', '', { shouldValidate: true });
                  }}
                  options={[
                    { value: 'project' as const, label: 'Project', icon: <Briefcase className="h-3.5 w-3.5" /> },
                    { value: 'office' as const, label: 'Office / General', icon: <Building2 className="h-3.5 w-3.5" /> },
                  ]}
                />
              )}
            />

            {assignmentType === 'project' ? (
              <div className="space-y-1">
                <Select
                  key={`${selectedProjectId || 'none'}:${projectOptions.length}`}
                  value={selectedProjectId || ''}
                  onValueChange={(v) => setValue('projectId', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((p) => (
                      <SelectItem key={String(p._id)} value={String(p._id)}>
                        {p.name}{p.code ? ` (${p.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && (
                  <p className="text-xs text-destructive">{errors.projectId.message}</p>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Not tied to a project — general office or overhead expense.
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(v) => setValue('priority', v as PrPriority, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  {PR_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PR_PRIORITY_LABELS[p as PrPriority]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="neededByDate">Required Date</Label>
              <Input id="neededByDate" type="date" {...register('neededByDate')} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder={requestType === 'job_request'
                ? 'e.g. Electrical rewiring for Building A'
                : 'e.g. Busway Phase 2 Pole Hardware'
              }
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Purpose <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="justification"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Explain the purpose — what operations or project work this supports..."
              {...register('justification')}
            />
            {errors.justification && <p className="text-xs text-destructive">{errors.justification.message}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
