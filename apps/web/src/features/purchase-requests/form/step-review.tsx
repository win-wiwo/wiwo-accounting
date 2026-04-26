import { type UseFormReturn } from 'react-hook-form';
import { SourcingType, PR_PRIORITY_LABELS, type PrPriority } from '@prams/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Pencil } from 'lucide-react';
import type { FormData, ProjectOption } from './schemas';
import { formatCurrency } from './utils';

interface StepReviewProps {
  form: UseFormReturn<FormData>;
  projectOptions: ProjectOption[];
  totalAmount: number;
  hasProcurementItems: boolean;
  stagedPhotosCount: number;
  onGoToStep: (step: number) => void;
}

export function StepReview({
  form, projectOptions, totalAmount, hasProcurementItems,
  stagedPhotosCount,
  onGoToStep,
}: StepReviewProps) {
  const data = form.getValues();
  const { errors } = form.formState;

  const project = projectOptions.find((p) => String(p._id) === data.projectId);
  const isReturned = data._isReturned;

  return (
    <div className="space-y-4">
      {/* Basics summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Request Basics</CardTitle>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onGoToStep(0)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Title</dt>
              <dd className="font-medium">{data.title || <span className="text-destructive">Missing</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Request Type</dt>
              <dd>{data.requestType === 'job_request' ? 'Job Request' : 'Purchase Request'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Purpose</dt>
              <dd className="whitespace-pre-wrap">{data.justification || <span className="text-destructive">Missing</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned To</dt>
              <dd>
                {data.assignmentType === 'office'
                  ? 'Office / General'
                  : project
                    ? `${project.name}${project.code ? ` (${project.code})` : ''}`
                    : <span className="text-destructive">No project selected</span>
                }
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Priority</dt>
              <dd>{PR_PRIORITY_LABELS[data.priority as PrPriority] || data.priority}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Needed By</dt>
              <dd>{data.neededByDate || 'Not specified'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Items summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Line Items ({data.items.length})</CardTitle>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onGoToStep(1)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.items.map((item, i) => {
              const isOnline = item.sourcingType === SourcingType.ONLINE;
              const lineTotal = isOnline ? (Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0) : 0;
              return (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{item.description || `Item ${i + 1}`}</span>
                    <span className="text-muted-foreground ml-2">
                      x{item.quantity} {item.unit}
                    </span>
                    {isOnline && (
                      <span className="text-blue-600 text-xs ml-2">Online</span>
                    )}
                  </div>
                  <span className="font-medium ml-4 shrink-0">
                    {isOnline ? formatCurrency(lineTotal) : 'TBD'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end border-t pt-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {hasProcurementItems ? 'Online items subtotal' : 'Total'}
              </p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          {stagedPhotosCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {stagedPhotosCount} item photo(s) pending upload
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resubmission note — only for returned PRs */}
      {isReturned && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              What changed? <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              rows={3}
              className="flex w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              placeholder="e.g. Replaced item 2 with a cheaper model, added 3 seller references for item 1, updated quantity of item 3 from 5 to 3..."
              {...form.register('resubmissionNote')}
            />
            {errors.resubmissionNote && (
              <p className="mt-1 text-xs text-destructive">{errors.resubmissionNote.message}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
