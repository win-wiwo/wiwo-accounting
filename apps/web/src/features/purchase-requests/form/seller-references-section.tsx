import { useFieldArray } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  FormField,
  GhostButton,
  premiumTextareaClass,
} from '@/components/premium';
import type { FormData } from './schemas';

interface SellerRefsSectionProps {
  itemIndex: number;
  form: UseFormReturn<FormData>;
}

export function SellerReferencesSection({ itemIndex, form }: SellerRefsSectionProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.sellerReferences`,
  });

  const refs = watch(`items.${itemIndex}.sellerReferences`) ?? [];
  const needsJustification = refs.length < 3;
  const itemErrors = errors.items?.[itemIndex] as
    | Record<string, { message?: string }>
    | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-zinc-700">Seller References</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {refs.length}/3 sellers added
            {refs.length < 3 && (
              <span className="ml-1 text-amber-600">
                — justification required below
              </span>
            )}
          </p>
        </div>
        {fields.length < 3 && (
          <GhostButton
            type="button"
            onClick={() => append({ sellerName: '', price: 0, notes: '' })}
            className="px-2.5 py-1 text-[12px]"
          >
            <Plus className="h-3 w-3" /> Add Seller
          </GhostButton>
        )}
      </div>

      {fields.map((field, si) => (
        <div
          key={field.id}
          className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
              Seller {si + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(si)}
              className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              aria-label="Remove seller"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Seller Name" required>
              <Input
                className="h-8 text-[12px]"
                placeholder="e.g. Lazada PH - TechSupplies"
                {...register(
                  `items.${itemIndex}.sellerReferences.${si}.sellerName`,
                )}
              />
            </FormField>
            <FormField label="Price (PHP)" required>
              <Input
                className="h-8 text-[12px]"
                type="number"
                min={0}
                step="0.01"
                {...register(`items.${itemIndex}.sellerReferences.${si}.price`, {
                  valueAsNumber: true,
                })}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <Input
              className="h-8 text-[12px]"
              placeholder="e.g. includes shipping, 1yr warranty"
              {...register(`items.${itemIndex}.sellerReferences.${si}.notes`)}
            />
          </FormField>
        </div>
      ))}

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 p-3 text-center text-[12px] text-zinc-400">
          No sellers added yet. Add at least 1, ideally 3.
        </div>
      )}

      {needsJustification && (
        <FormField
          label={
            <span className="flex items-center gap-1 text-amber-700">
              <AlertCircle className="h-3 w-3" />
              Justify why fewer than 3 sellers
            </span> as unknown as string
          }
          required
          error={itemErrors?.sellerReferencesJustification?.message}
        >
          <textarea
            rows={2}
            className={premiumTextareaClass}
            placeholder="e.g. Only one supplier carries this specific model in the Philippines..."
            {...register(`items.${itemIndex}.sellerReferencesJustification`)}
          />
        </FormField>
      )}
    </div>
  );
}
