import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft, Loader2, Save } from 'lucide-react';
import {
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from '@/hooks/use-purchase-orders';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageHeader,
  Surface,
  PrimaryButton,
  GhostButton,
  FormField,
  premiumSelectTriggerClass,
  premiumTextareaClass,
} from '@/components/premium';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number({ coerce: true }).min(1, 'Min 1'),
  unit: z.string().min(1, 'Required'),
  unitPrice: z.number({ coerce: true }).min(0, 'Min 0'),
  notes: z.string().optional(),
});

const formSchema = z.object({
  purchaseRequestId: z.string().min(1, 'Required'),
  sourceRequestType: z.string().min(1, 'Required'),
  supplierId: z.string().optional(),
  projectName: z.string().max(200).optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  remarks: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof formSchema>;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

export function PoFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: poData, isLoading: poLoading } = usePurchaseOrder(id ?? '');
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();

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
      purchaseRequestId: '',
      sourceRequestType: 'purchase_request',
      supplierId: '',
      projectName: '',
      items: [{ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, notes: '' }],
      remarks: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems = watch('items');

  const totalAmount =
    watchItems?.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0) ?? 0;

  useEffect(() => {
    if (isEdit && poData?.data) {
      const po = poData.data;
      const prId =
        po.purchaseRequestId && typeof po.purchaseRequestId === 'object'
          ? (po.purchaseRequestId as { _id: string })._id
          : (po.purchaseRequestId as string) || '';
      const supId =
        po.supplierId && typeof po.supplierId === 'object'
          ? (po.supplierId as { _id: string })._id
          : (po.supplierId as string) || '';

      reset({
        purchaseRequestId: prId,
        sourceRequestType: po.sourceRequestType || 'purchase_request',
        supplierId: supId,
        projectName: po.projectName || '',
        items: po.items.map(
          (item: {
            description: string;
            quantity: number;
            unit: string;
            unitPrice: number;
            notes?: string;
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            notes: item.notes || '',
          }),
        ),
        remarks: po.remarks || '',
      });
    }
  }, [isEdit, poData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        supplierId: data.supplierId || undefined,
        projectName: data.projectName || undefined,
        remarks: data.remarks || undefined,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: 'PO updated', variant: 'success' });
        navigate(`/purchase-orders/${id}`);
      } else {
        await createMutation.mutateAsync(payload);
        toast({
          title: 'PO created as draft',
          description: 'Submit it when ready for approval.',
          variant: 'success',
        });
        navigate('/purchase-orders');
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';
      toast({
        title: 'Error',
        description: message || 'Failed to save.',
        variant: 'error',
      });
    }
  };

  if (isEdit && poLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-64" />
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
        actions={
          <GhostButton onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Source Request */}
        <Surface delay={0.04}>
          <PanelHeader title="Source Request" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Source Request ID"
                htmlFor="purchaseRequestId"
                required
                error={errors.purchaseRequestId?.message}
              >
                <Input
                  id="purchaseRequestId"
                  placeholder="Enter the PR or JR ID"
                  {...register('purchaseRequestId')}
                />
              </FormField>

              <FormField
                label="Source Type"
                required
                error={errors.sourceRequestType?.message}
              >
                <Select
                  value={watch('sourceRequestType')}
                  onValueChange={(v) =>
                    setValue('sourceRequestType', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className={premiumSelectTriggerClass}>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_request">Purchase Request</SelectItem>
                    <SelectItem value="job_request">Job Request</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        </Surface>

        {/* Supplier & Project */}
        <Surface delay={0.06}>
          <PanelHeader title="Supplier & Project" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Supplier ID" htmlFor="supplierId">
                <Input
                  id="supplierId"
                  placeholder="Enter the Supplier ID (optional)"
                  {...register('supplierId')}
                />
              </FormField>

              <FormField
                label="Project Name"
                htmlFor="projectName"
                error={errors.projectName?.message}
              >
                <Input
                  id="projectName"
                  placeholder="Project name for tracking"
                  {...register('projectName')}
                />
              </FormField>
            </div>
          </div>
        </Surface>

        {/* Line Items */}
        <Surface delay={0.08}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-[15px] font-semibold text-zinc-900">Line Items</h2>
            <GhostButton
              type="button"
              onClick={() =>
                append({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, notes: '' })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </GhostButton>
          </div>
          <div className="px-6 pb-6">
            {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
              <p className="mb-3 text-[12px] text-red-600">{errors.items.message as string}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => {
                const qty = Number(watchItems?.[index]?.quantity) || 0;
                const price = Number(watchItems?.[index]?.unitPrice) || 0;
                const lineTotal = qty * price;

                return (
                  <div
                    key={field.id}
                    className="rounded-xl border border-zinc-100 bg-white p-5 transition-all duration-150 hover:border-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                        Item {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <FormField
                        label="Description"
                        className="sm:col-span-5"
                        error={errors.items?.[index]?.description?.message}
                      >
                        <Input
                          placeholder="Item description"
                          {...register(`items.${index}.description`)}
                        />
                      </FormField>

                      <FormField label="Quantity" className="sm:col-span-2">
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                      </FormField>

                      <FormField label="Unit" className="sm:col-span-1">
                        <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                      </FormField>

                      <FormField label="Unit Price" className="sm:col-span-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                      </FormField>

                      <div className="sm:col-span-2 flex items-end">
                        <div className="w-full rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 text-right text-[13px] font-semibold text-zinc-800 tabular-nums">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input
                        placeholder="Notes (optional)"
                        className="text-[12px]"
                        {...register(`items.${index}.notes`)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-5 flex justify-end">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-6 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Total Amount
                </p>
                <p className="mt-1 text-[20px] font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </Surface>

        {/* Remarks */}
        <Surface delay={0.1}>
          <PanelHeader title="Additional Information" />
          <div className="px-6 pb-6">
            <FormField
              label="Remarks"
              htmlFor="remarks"
              error={errors.remarks?.message}
            >
              <textarea
                id="remarks"
                rows={3}
                className={premiumTextareaClass}
                placeholder="Any additional notes or remarks..."
                {...register('remarks')}
              />
            </FormField>
          </div>
        </Surface>

        <div className="flex justify-end gap-2">
          <GhostButton type="button" onClick={() => navigate('/purchase-orders')}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Save as Draft'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
    </div>
  );
}
