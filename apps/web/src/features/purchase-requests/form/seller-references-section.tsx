import { useFieldArray } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { FormData } from './schemas';

interface SellerRefsSectionProps {
  itemIndex: number;
  form: UseFormReturn<FormData>;
}

export function SellerReferencesSection({ itemIndex, form }: SellerRefsSectionProps) {
  const { control, register, watch, formState: { errors } } = form;
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
            onClick={() => append({ sellerName: '', price: 0, notes: '' })}
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
