import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import {
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
} from '@/hooks/use-suppliers';
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

const supplierFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  taxType: z.enum(['vat', 'non_vat'], { required_error: 'Tax type is required' }),
  tin: z.string().min(1, 'TIN is required').max(50),
  contactPerson: z.string().max(200).optional().or(z.literal('')),
  contactNumber: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  paymentTerms: z.string().max(200).optional().or(z.literal('')),
  bankAccountName: z.string().max(200).optional().or(z.literal('')),
  bankAccountNumber: z.string().max(50).optional().or(z.literal('')),
  bankName: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

export function SupplierFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: supplierData, isLoading: supplierLoading } = useSupplier(id ?? '');
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      companyName: '',
      address: '',
      taxType: undefined,
      tin: '',
      contactPerson: '',
      contactNumber: '',
      email: '',
      paymentTerms: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankName: '',
      notes: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (isEdit && supplierData?.data) {
      const s = supplierData.data;
      reset({
        companyName: s.companyName,
        address: s.address,
        taxType: s.taxType,
        tin: s.tin,
        contactPerson: s.contactPerson || '',
        contactNumber: s.contactNumber || '',
        email: s.email || '',
        paymentTerms: s.paymentTerms || '',
        bankAccountName: s.bankAccountName || '',
        bankAccountNumber: s.bankAccountNumber || '',
        bankName: s.bankName || '',
        notes: s.notes || '',
        status: s.status,
      });
    }
  }, [isEdit, supplierData, reset]);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const payload = {
        ...data,
        contactPerson: data.contactPerson || undefined,
        contactNumber: data.contactNumber || undefined,
        email: data.email || undefined,
        paymentTerms: data.paymentTerms || undefined,
        bankAccountName: data.bankAccountName || undefined,
        bankAccountNumber: data.bankAccountNumber || undefined,
        bankName: data.bankName || undefined,
        notes: data.notes || undefined,
        status: isEdit ? data.status : undefined,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: 'Supplier updated', variant: 'success' });
        navigate(`/suppliers/${id}`);
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Supplier created', variant: 'success' });
        navigate('/suppliers');
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

  if (isEdit && supplierLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-64" />
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={isEdit ? 'Edit Supplier' : 'New Supplier'}
        actions={
          <GhostButton onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Surface delay={0.04}>
          <PanelHeader title="Company Information" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Company Name"
                htmlFor="companyName"
                required
                error={errors.companyName?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  {...register('companyName')}
                />
              </FormField>

              <FormField
                label="Address"
                htmlFor="address"
                required
                error={errors.address?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="address"
                  rows={2}
                  className={premiumTextareaClass}
                  placeholder="Enter company address"
                  {...register('address')}
                />
              </FormField>

              <FormField label="Tax Type" required error={errors.taxType?.message}>
                <Select
                  value={watch('taxType') || ''}
                  onValueChange={(v) =>
                    setValue('taxType', v as 'vat' | 'non_vat', { shouldValidate: true })
                  }
                >
                  <SelectTrigger className={premiumSelectTriggerClass}>
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vat">VAT</SelectItem>
                    <SelectItem value="non_vat">Non-VAT</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="TIN"
                htmlFor="tin"
                required
                error={errors.tin?.message}
              >
                <Input
                  id="tin"
                  placeholder="Tax Identification Number"
                  {...register('tin')}
                />
              </FormField>
            </div>
          </div>
        </Surface>

        {/* Contact Information */}
        <Surface delay={0.06}>
          <PanelHeader title="Contact Information" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Contact Person"
                htmlFor="contactPerson"
                error={errors.contactPerson?.message}
              >
                <Input
                  id="contactPerson"
                  placeholder="Full name"
                  {...register('contactPerson')}
                />
              </FormField>
              <FormField
                label="Contact Number"
                htmlFor="contactNumber"
                error={errors.contactNumber?.message}
              >
                <Input
                  id="contactNumber"
                  placeholder="Phone number"
                  {...register('contactNumber')}
                />
              </FormField>
              <FormField
                label="Email"
                htmlFor="email"
                error={errors.email?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="email@company.com"
                  {...register('email')}
                />
              </FormField>
            </div>
          </div>
        </Surface>

        {/* Banking Information */}
        <Surface delay={0.08}>
          <PanelHeader title="Banking Information" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Bank Account Name"
                htmlFor="bankAccountName"
                error={errors.bankAccountName?.message}
              >
                <Input
                  id="bankAccountName"
                  placeholder="Account holder name"
                  {...register('bankAccountName')}
                />
              </FormField>
              <FormField
                label="Bank Account Number"
                htmlFor="bankAccountNumber"
                error={errors.bankAccountNumber?.message}
              >
                <Input
                  id="bankAccountNumber"
                  placeholder="Account number"
                  {...register('bankAccountNumber')}
                />
              </FormField>
              <FormField
                label="Bank Name"
                htmlFor="bankName"
                error={errors.bankName?.message}
              >
                <Input
                  id="bankName"
                  placeholder="Name of the bank"
                  {...register('bankName')}
                />
              </FormField>
              <FormField
                label="Payment Terms"
                htmlFor="paymentTerms"
                error={errors.paymentTerms?.message}
              >
                <Input
                  id="paymentTerms"
                  placeholder="e.g. Net 30, COD"
                  {...register('paymentTerms')}
                />
              </FormField>
            </div>
          </div>
        </Surface>

        {/* Additional */}
        <Surface delay={0.1}>
          <PanelHeader title="Additional" />
          <div className="px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {isEdit && (
                <FormField label="Status">
                  <Select
                    value={watch('status') || 'active'}
                    onValueChange={(v) =>
                      setValue(
                        'status',
                        v as 'active' | 'inactive' | 'blacklisted',
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              <FormField
                label="Notes"
                htmlFor="notes"
                error={errors.notes?.message}
                className={isEdit ? '' : 'sm:col-span-2'}
              >
                <textarea
                  id="notes"
                  rows={3}
                  className={premiumTextareaClass}
                  placeholder="Additional notes about this supplier..."
                  {...register('notes')}
                />
              </FormField>
            </div>
          </div>
        </Surface>

        <div className="flex justify-end gap-2">
          <GhostButton type="button" onClick={() => navigate('/suppliers')}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Supplier'}
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
