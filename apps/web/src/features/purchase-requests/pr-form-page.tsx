import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PR_PRIORITIES, PR_PRIORITY_LABELS, type PrPriority } from '@prams/shared';
import { usePurchaseRequest, useCreatePr, useUpdatePr } from '@/hooks/use-purchase-requests';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number({ coerce: true }).int().min(1, 'Min 1'),
  unit: z.string().min(1, 'Required'),
  estimatedPrice: z.number({ coerce: true }).min(0, 'Min 0'),
  notes: z.string().optional(),
});

const formSchema = z.object({
  requestType: z.enum(['purchase_request', 'job_request']).default('purchase_request'),
  title: z.string().min(1, 'Required').max(200),
  projectName: z.string().max(200).optional(),
  description: z.string().min(1, 'Required').max(2000),
  priority: z.string().min(1, 'Required'),
  justification: z.string().min(1, 'Required').max(2000),
  neededByDate: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type FormData = z.infer<typeof formSchema>;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

export function PrFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: prData, isLoading: prLoading } = usePurchaseRequest(id ?? '');
  const createMutation = useCreatePr();
  const updateMutation = useUpdatePr();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestType: 'purchase_request',
      items: [{ description: '', quantity: 1, unit: 'pcs', estimatedPrice: 0, notes: '' }],
      priority: 'medium',
      projectName: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems = watch('items');

  const totalAmount = watchItems?.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.estimatedPrice) || 0;
    return sum + qty * price;
  }, 0) ?? 0;

  useEffect(() => {
    if (isEdit && prData?.data) {
      const pr = prData.data;
      reset({
        requestType: pr.requestType || 'purchase_request',
        title: pr.title,
        projectName: pr.projectName || '',
        description: pr.description,
        priority: pr.priority,
        justification: pr.justification,
        neededByDate: pr.neededByDate ? pr.neededByDate.split('T')[0] : '',
        items: pr.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          notes: item.notes || '',
        })),
      });
    }
  }, [isEdit, prData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        neededByDate: data.neededByDate ? new Date(data.neededByDate).toISOString() : undefined,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: 'PR updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'PR created as draft', description: 'Submit it when ready for approval.', variant: 'success' });
      }
      navigate('/purchase-requests');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({ title: 'Error', description: message || 'Failed to save.', variant: 'error' });
    }
  };

  if (isEdit && prLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const requestType = watch('requestType');
  const isJR = requestType === 'job_request';
  const typeLabel = isJR ? 'Job Request' : 'Purchase Request';

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}>
        <Button variant="outline" onClick={() => navigate('/purchase-requests')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {!isEdit && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Request Type</Label>
                  <Select
                    value={requestType}
                    onValueChange={(v) => setValue('requestType', v as 'purchase_request' | 'job_request', { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase_request">Purchase Request (PR)</SelectItem>
                      <SelectItem value="job_request">Job Request (JR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {isJR
                      ? 'Job Requests are for services, repairs, and labor-based work.'
                      : 'Purchase Requests are for goods, materials, and supplies.'}
                  </p>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Brief title for this purchase request" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" placeholder="Project name for monitoring purposes" {...register('projectName')} />
                {errors.projectName && <p className="text-xs text-destructive">{errors.projectName.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Detailed description of what is being requested and why..."
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(v) => setValue('priority', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
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
                {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="neededByDate">Needed By</Label>
                <Input id="neededByDate" type="date" {...register('neededByDate')} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="justification">Business Justification</Label>
                <textarea
                  id="justification"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Why is this purchase necessary?"
                  {...register('justification')}
                />
                {errors.justification && <p className="text-xs text-destructive">{errors.justification.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Line Items</CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1, unit: 'pcs', estimatedPrice: 0, notes: '' })}
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
              <p className="mb-3 text-xs text-destructive">{errors.items.message as string}</p>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => {
                const qty = Number(watchItems?.[index]?.quantity) || 0;
                const price = Number(watchItems?.[index]?.estimatedPrice) || 0;
                const lineTotal = qty * price;

                return (
                  <div key={field.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="space-y-1 sm:col-span-5">
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="Item description"
                          {...register(`items.${index}.description`)}
                        />
                        {errors.items?.[index]?.description && (
                          <p className="text-xs text-destructive">{errors.items[index].description?.message}</p>
                        )}
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-xs">Unit</Label>
                        <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.estimatedPrice`, { valueAsNumber: true })}
                        />
                      </div>

                      <div className="flex items-end sm:col-span-2">
                        <div className="w-full rounded-md bg-muted/50 px-3 py-2 text-right text-sm font-medium">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Input
                        placeholder="Notes (optional)"
                        className="text-xs"
                        {...register(`items.${index}.notes`)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 flex justify-end">
              <div className="rounded-lg bg-primary/5 px-6 py-3 text-right">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchase-requests')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
