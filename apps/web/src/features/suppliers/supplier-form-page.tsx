import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

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
      // Clean up empty optional strings
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
      toast({ title: 'Error', description: message || 'Failed to save.', variant: 'error' });
    }
  };

  if (isEdit && supplierLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? 'Edit Supplier' : 'New Supplier'}>
        <Button variant="outline" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyName">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-xs text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="address"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter company address"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Tax Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('taxType') || ''}
                  onValueChange={(v) => setValue('taxType', v as 'vat' | 'non_vat', { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vat">VAT</SelectItem>
                    <SelectItem value="non_vat">Non-VAT</SelectItem>
                  </SelectContent>
                </Select>
                {errors.taxType && (
                  <p className="text-xs text-destructive">{errors.taxType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tin">
                  TIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tin"
                  placeholder="Tax Identification Number"
                  {...register('tin')}
                />
                {errors.tin && (
                  <p className="text-xs text-destructive">{errors.tin.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  placeholder="Full name"
                  {...register('contactPerson')}
                />
                {errors.contactPerson && (
                  <p className="text-xs text-destructive">{errors.contactPerson.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  placeholder="Phone number"
                  {...register('contactNumber')}
                />
                {errors.contactNumber && (
                  <p className="text-xs text-destructive">{errors.contactNumber.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@company.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Banking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankAccountName">Bank Account Name</Label>
                <Input
                  id="bankAccountName"
                  placeholder="Account holder name"
                  {...register('bankAccountName')}
                />
                {errors.bankAccountName && (
                  <p className="text-xs text-destructive">{errors.bankAccountName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  placeholder="Account number"
                  {...register('bankAccountNumber')}
                />
                {errors.bankAccountNumber && (
                  <p className="text-xs text-destructive">{errors.bankAccountNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="Name of the bank"
                  {...register('bankName')}
                />
                {errors.bankName && (
                  <p className="text-xs text-destructive">{errors.bankName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g. Net 30, COD"
                  {...register('paymentTerms')}
                />
                {errors.paymentTerms && (
                  <p className="text-xs text-destructive">{errors.paymentTerms.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={watch('status') || 'active'}
                    onValueChange={(v) =>
                      setValue('status', v as 'active' | 'inactive' | 'blacklisted', { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={`space-y-2 ${isEdit ? '' : 'sm:col-span-2'}`}>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Additional notes about this supplier..."
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-xs text-destructive">{errors.notes.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/suppliers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </div>
  );
}
