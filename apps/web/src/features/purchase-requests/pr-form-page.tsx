import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PR_PRIORITIES, PR_PRIORITY_LABELS, SourcingType, type PrPriority } from '@prams/shared';
import { usePurchaseRequest, useCreatePr, useUpdatePr, useSubmitPr } from '@/hooks/use-purchase-requests';
import { useActiveProjects } from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Save, Send, Plus, Trash2, ShoppingCart, Globe, AlertCircle } from 'lucide-react';

// ─── Schemas ────────────────────────────────────────────────────────────────

const sellerReferenceSchema = z.object({
  sellerName: z.string().min(1, 'Seller name required').max(100),
  url: z.string().max(1000).optional(),
  price: z.number({ coerce: true }).min(0, 'Price required'),
  notes: z.string().max(500).optional(),
});

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number({ coerce: true }).int().min(1, 'Min 1'),
  unit: z.string().min(1, 'Required'),
  specifications: z.string().max(1000).optional(),
  sourcingType: z.enum([SourcingType.PROCUREMENT, SourcingType.ONLINE]),
  estimatedPrice: z.number({ coerce: true }).min(0).optional(),
  notes: z.string().max(500).optional(),
  sellerReferences: z.array(sellerReferenceSchema).max(3).optional(),
  sellerReferencesJustification: z.string().max(500).optional(),
}).superRefine((item, ctx) => {
  if (item.sourcingType === SourcingType.ONLINE) {
    if (!item.estimatedPrice || item.estimatedPrice <= 0) {
      ctx.addIssue({ code: 'custom', path: ['estimatedPrice'], message: 'Price required for online-sourced items' });
    }
    const refs = item.sellerReferences ?? [];
    if (refs.length < 3 && !item.sellerReferencesJustification?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['sellerReferencesJustification'],
        message: `Justify why only ${refs.length} seller${refs.length === 1 ? '' : 's'} provided (3 required)`,
      });
    }
  }
});

const formSchema = z.object({
  requestType: z.enum(['purchase_request', 'job_request']).default('purchase_request'),
  isOfficeUse: z.boolean().default(false),
  title: z.string().min(1, 'Required').max(200),
  projectId: z.string().optional(),
  description: z.string().min(1, 'Required').max(2000),
  priority: z.string().min(1, 'Required'),
  justification: z.string().min(1, 'Required').max(2000),
  neededByDate: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
}).superRefine((data, ctx) => {
  if (!data.isOfficeUse && !data.projectId) {
    ctx.addIssue({
      code: 'custom',
      path: ['projectId'],
      message: 'Select a project, or check "For office / general use" below.',
    });
  }
});

type FormData = z.infer<typeof formSchema>;
type LineItemForm = z.infer<typeof lineItemSchema>;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

const defaultItem = (): LineItemForm => ({
  description: '',
  quantity: 1,
  unit: 'pcs',
  specifications: '',
  sourcingType: SourcingType.PROCUREMENT,
  estimatedPrice: 0,
  notes: '',
  sellerReferences: [],
  sellerReferencesJustification: '',
});

// ─── Seller References sub-form ──────────────────────────────────────────────

interface SellerRefsProps {
  itemIndex: number;
  control: ReturnType<typeof useForm<FormData>>['control'];
  register: ReturnType<typeof useForm<FormData>>['register'];
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
}

function SellerReferencesSection({ itemIndex, control, register, watch, errors }: SellerRefsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.sellerReferences`,
  });

  const refs = watch(`items.${itemIndex}.sellerReferences`) ?? [];
  const needsJustification = refs.length < 3;
  const itemErrors = errors.items?.[itemIndex] as Record<string, { message?: string }> | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">Seller References</p>
          <p className="text-[11px] text-muted-foreground">
            {refs.length}/3 sellers added
            {refs.length < 3 && <span className="text-amber-600 ml-1">— justification required below</span>}
          </p>
        </div>
        {fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => append({ sellerName: '', url: '', price: 0, notes: '' })}
          >
            <Plus className="h-3 w-3" /> Add Seller
          </Button>
        )}
      </div>

      {fields.map((field, si) => (
        <div key={field.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Seller {si + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => remove(si)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Seller Name *</Label>
              <Input
                className="h-7 text-xs"
                placeholder="e.g. Lazada PH - TechSupplies"
                {...register(`items.${itemIndex}.sellerReferences.${si}.sellerName`)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Price (PHP) *</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                min={0}
                step="0.01"
                {...register(`items.${itemIndex}.sellerReferences.${si}.price`, { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Product URL</Label>
            <Input
              className="h-7 text-xs"
              placeholder="https://..."
              {...register(`items.${itemIndex}.sellerReferences.${si}.url`)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Notes</Label>
            <Input
              className="h-7 text-xs"
              placeholder="e.g. includes shipping, 1yr warranty"
              {...register(`items.${itemIndex}.sellerReferences.${si}.notes`)}
            />
          </div>
        </div>
      ))}

      {fields.length === 0 && (
        <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          No sellers added yet. Add at least 1, ideally 3.
        </div>
      )}

      {needsJustification && (
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1 text-amber-700">
            <AlertCircle className="h-3 w-3" />
            Justify why fewer than 3 sellers <span className="text-destructive">*</span>
          </Label>
          <textarea
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="e.g. Only one supplier carries this specific model in the Philippines..."
            {...register(`items.${itemIndex}.sellerReferencesJustification`)}
          />
          {itemErrors?.sellerReferencesJustification && (
            <p className="text-xs text-destructive">{itemErrors.sellerReferencesJustification.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export function PrFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: prData, isLoading: prLoading } = usePurchaseRequest(id ?? '');
  const { data: activeProjects } = useActiveProjects();
  const createMutation = useCreatePr();
  const updateMutation = useUpdatePr();
  const submitMutation = useSubmitPr();
  const submitActionRef = useRef<'draft' | 'submit'>('draft');

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
      isOfficeUse: false,
      items: [defaultItem()],
      priority: 'medium',
      projectId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const totalAmount = watchItems?.reduce((sum, item) => {
    if (item.sourcingType === SourcingType.ONLINE) {
      return sum + (Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0);
    }
    return sum; // procurement items: price not known yet
  }, 0) ?? 0;

  const hasProcurementItems = watchItems?.some((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? false;

  useEffect(() => {
    if (isEdit && prData?.data) {
      const pr = prData.data;
      const proj = pr.projectId as unknown as { _id: string } | null;
      reset({
        requestType: pr.requestType || 'purchase_request',
        isOfficeUse: !proj,
        title: pr.title,
        projectId: proj?._id || '',
        description: pr.description,
        priority: pr.priority,
        justification: pr.justification,
        neededByDate: pr.neededByDate ? pr.neededByDate.split('T')[0] : '',
        items: pr.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications || '',
          sourcingType: (item.sourcingType as SourcingType) || SourcingType.PROCUREMENT,
          estimatedPrice: item.estimatedPrice,
          notes: item.notes || '',
          sellerReferences: item.sellerReferences?.map((r) => ({
            sellerName: r.sellerName,
            url: r.url || '',
            price: r.price,
            notes: r.notes || '',
          })) ?? [],
          sellerReferencesJustification: item.sellerReferencesJustification || '',
        })),
      });
    }
  }, [isEdit, prData, reset]);

  const onInvalid = () => {
    toast({ title: 'Form has errors', description: 'Please fill in all required fields before submitting.', variant: 'error' });
  };

  const onSubmit = async (data: FormData) => {
    const action = submitActionRef.current;
    try {
      const { requestType, isOfficeUse, ...rest } = data;
      const payload = {
        ...rest,
        projectId: isOfficeUse ? undefined : data.projectId || undefined,
        neededByDate: data.neededByDate ? new Date(data.neededByDate).toISOString() : undefined,
        ...(!isEdit && { requestType }),
      };

      let prId: string;
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        prId = id!;
      } else {
        const result = await createMutation.mutateAsync(payload);
        prId = result.data!._id;
      }

      if (action === 'submit') {
        await submitMutation.mutateAsync(prId);
        const hasProcurement = data.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT);
        toast({
          title: hasProcurement ? 'Sent to Procurement Queue' : 'Submitted for Approval',
          variant: 'success',
        });
      } else {
        toast({ title: isEdit ? 'PR updated' : 'Saved as draft', variant: 'success' });
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

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase_request">Purchase Request (PR)</SelectItem>
                      <SelectItem value="job_request">Job Request (JR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Brief title for this request" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Project {!watch('isOfficeUse') && <span className="text-destructive">*</span>}
                  </Label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded"
                      {...register('isOfficeUse')}
                      onChange={(e) => {
                        setValue('isOfficeUse', e.target.checked, { shouldValidate: true });
                        if (e.target.checked) setValue('projectId', '', { shouldValidate: true });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">For office / general use</span>
                  </label>
                </div>
                {watch('isOfficeUse') ? (
                  <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    Not tied to a project — general office or overhead expense.
                  </div>
                ) : (
                  <>
                    <Select
                      value={watch('projectId') || ''}
                      onValueChange={(v) => setValue('projectId', v, { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeProjects ?? []).map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}{p.code ? ` (${p.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.projectId && (
                      <p className="text-xs text-destructive">{errors.projectId.message}</p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Detailed description of what is being requested..."
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
                <Label htmlFor="neededByDate">Needed By</Label>
                <Input id="neededByDate" type="date" {...register('neededByDate')} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="justification">Business Justification</Label>
                <textarea
                  id="justification"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Why is this request necessary?"
                  {...register('justification')}
                />
                {errors.justification && <p className="text-xs text-destructive">{errors.justification.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Line Items</CardTitle>
              <CardDescription className="mt-1 text-xs">
                Choose <strong>Procurement</strong> if the Procurement team will source the price, or{' '}
                <strong>Online</strong> if you've already found sellers.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(defaultItem())}
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
              <p className="text-xs text-destructive">{errors.items.message as string}</p>
            )}

            {fields.map((field, index) => {
              const item = watchItems?.[index];
              const isOnline = item?.sourcingType === SourcingType.ONLINE;
              const qty = Number(item?.quantity) || 0;
              const price = isOnline ? Number(item?.estimatedPrice) || 0 : 0;
              const lineTotal = qty * price;
              const itemErrors = errors.items?.[index] as Record<string, { message?: string }> | undefined;

              return (
                <div key={field.id} className="rounded-lg border p-4 space-y-4">
                  {/* Item header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      <Controller
                        control={control}
                        name={`items.${index}.sourcingType`}
                        render={({ field: f }) => (
                          <div className="flex rounded-md border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => f.onChange(SourcingType.PROCUREMENT)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                                f.value === SourcingType.PROCUREMENT
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Procurement
                            </button>
                            <button
                              type="button"
                              onClick={() => f.onChange(SourcingType.ONLINE)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                                f.value === SourcingType.ONLINE
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-background text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <Globe className="h-3 w-3" />
                              Online
                            </button>
                          </div>
                        )}
                      />
                    </div>
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

                  {/* Core item fields */}
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="space-y-1 sm:col-span-5">
                      <Label className="text-xs">Description *</Label>
                      <Input placeholder="Item description" {...register(`items.${index}.description`)} />
                      {itemErrors?.description && (
                        <p className="text-xs text-destructive">{itemErrors.description.message}</p>
                      )}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Quantity *</Label>
                      <Input type="number" min={1} {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                      {itemErrors?.quantity && (
                        <p className="text-xs text-destructive">{itemErrors.quantity.message}</p>
                      )}
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs">Unit *</Label>
                      <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                      {itemErrors?.unit && (
                        <p className="text-xs text-destructive">{itemErrors.unit.message}</p>
                      )}
                    </div>

                    {isOnline ? (
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Unit Price *</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.estimatedPrice`, { valueAsNumber: true })}
                        />
                        {itemErrors?.estimatedPrice && (
                          <p className="text-xs text-destructive">{itemErrors.estimatedPrice.message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-end sm:col-span-2">
                        <div className="w-full rounded-md bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                          TBD by Procurement
                        </div>
                      </div>
                    )}

                    <div className="flex items-end sm:col-span-2">
                      <div className="w-full rounded-md bg-muted/50 px-3 py-2 text-right text-sm font-medium">
                        {isOnline ? formatCurrency(lineTotal) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Specifications {!isOnline && <span className="text-muted-foreground">(helps Procurement source the right item)</span>}
                    </Label>
                    <textarea
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Exact model, brand, dimensions, capacity, color, etc."
                      {...register(`items.${index}.specifications`)}
                    />
                  </div>

                  {/* Notes */}
                  <Input
                    placeholder="Additional notes (optional)"
                    className="text-xs"
                    {...register(`items.${index}.notes`)}
                  />

                  {/* Seller References — online only */}
                  {isOnline && (
                    <>
                      <Separator />
                      <SellerReferencesSection
                        itemIndex={index}
                        control={control}
                        register={register}
                        watch={watch}
                        errors={errors}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-6 py-3">
              <div className="text-xs text-muted-foreground">
                {hasProcurementItems && (
                  <p className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Procurement-sourced items will be priced after Procurement team quotes them.
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {hasProcurementItems ? 'Online items subtotal' : 'Total Amount'}
                </p>
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
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => { submitActionRef.current = 'draft'; }}
          >
            {isSubmitting && submitActionRef.current === 'draft'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
            Save as Draft
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => { submitActionRef.current = 'submit'; }}
          >
            {isSubmitting && submitActionRef.current === 'submit'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            {hasProcurementItems ? 'Submit to Procurement' : 'Submit for Approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}
