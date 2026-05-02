import { useFieldArray } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Plus, Trash2, AlertCircle, Check, Users, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  FormField,
  GhostButton,
  premiumTextareaClass,
} from '@/components/premium';
import { cn } from '@/lib/utils';
import type { FormData } from './schemas';

interface SellerRefsSectionProps {
  itemIndex: number;
  form: UseFormReturn<FormData>;
  selectedSellerIndex: number | undefined;
  onSelectSeller: (sellerIndex: number) => void;
  onRemoveSeller: (sellerIndex: number) => void;
}

export function SellerReferencesSection({
  itemIndex,
  form,
  selectedSellerIndex,
  onSelectSeller,
  onRemoveSeller,
}: SellerRefsSectionProps) {
  const {
    control,
    register,
    watch,
    setValue,
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

  const handleAppendSeller = () => {
    const newIndex = fields.length;
    append({ sellerName: '', price: 0, url: '', notes: '' });
    // Auto-select if this is the first seller
    if (fields.length === 0) {
      setTimeout(() => onSelectSeller(newIndex), 0);
    }
  };

  const handleRemove = (si: number) => {
    remove(si);
    onRemoveSeller(si);
  };

  return (
    <div className="px-5 py-3 space-y-3">
      {/* ── Section header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            Supplier References
          </p>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none',
              refs.length >= 3
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            )}
          >
            {refs.length}/3
          </span>
        </div>
        {fields.length < 3 && (
          <GhostButton
            type="button"
            onClick={handleAppendSeller}
            className="h-7 px-2.5 text-[11px]"
          >
            <Plus className="h-3 w-3" /> Add Seller
          </GhostButton>
        )}
      </div>

      {/* ── Progress bar ────────────────────────────────── */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            refs.length >= 3 ? 'bg-emerald-500' : 'bg-amber-400',
          )}
          style={{ width: `${Math.min(100, (refs.length / 3) * 100)}%` }}
        />
      </div>

      {/* ── Empty state ─────────────────────────────────── */}
      {fields.length === 0 && (
        <div className={cn(
          'rounded-xl border border-dashed px-5 py-5 text-center',
          itemErrors?.sellerReferences?.message
            ? 'border-red-300 bg-red-50/40'
            : 'border-zinc-200 bg-zinc-50/40',
        )}>
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200">
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2.5 text-[12px] font-semibold text-zinc-700">
            No seller references yet
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
            3 sellers is the standard. The selected seller's price becomes the unit price.
          </p>
          <GhostButton
            type="button"
            onClick={handleAppendSeller}
            className="mt-3 px-3 py-1.5 text-[12px]"
          >
            <Plus className="h-3 w-3" /> Add First Seller
          </GhostButton>
          {itemErrors?.sellerReferences?.message && (
            <p className="mt-2 text-[12px] text-red-600">
              {itemErrors.sellerReferences.message as string}
            </p>
          )}
        </div>
      )}

      {/* ── Seller rows ─────────────────────────────────── */}
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field, si) => {
            const isSelected = selectedSellerIndex === si;
            return (
              <div
                key={field.id}
                className={cn(
                  'rounded-lg border bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3 transition-colors duration-150',
                  isSelected
                    ? 'border-zinc-800/80 bg-zinc-50/40'
                    : 'border-zinc-100 hover:border-zinc-200',
                )}
              >
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 tabular-nums">
                      {si + 1}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                      Seller {si + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectSeller(si)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150',
                        isSelected
                          ? 'bg-zinc-900 text-white'
                          : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700',
                      )}
                      aria-pressed={isSelected}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {isSelected ? 'Selected' : 'Use this price'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(si)}
                      className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label="Remove seller"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Seller Name" required>
                    <Input
                      className="h-9 text-[12px]"
                      placeholder="e.g. Lazada PH — TechSupplies"
                      {...register(
                        `items.${itemIndex}.sellerReferences.${si}.sellerName`,
                      )}
                    />
                  </FormField>
                  <FormField label="Price (PHP)" required>
                    <Input
                      className="h-9 text-[12px] tabular-nums"
                      type="number"
                      min={0}
                      step="0.01"
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.value = '';
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') e.target.value = '0';
                      }}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (!/^\d*\.?\d+$/.test(text.trim())) e.preventDefault();
                      }}
                      {...register(
                        `items.${itemIndex}.sellerReferences.${si}.price`,
                        {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const raw = e.target.value;
                            if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
                              e.target.value = raw.replace(/^0+/, '');
                            }
                            if (isSelected) {
                              setValue(
                                `items.${itemIndex}.estimatedPrice`,
                                parseFloat(e.target.value) || 0,
                                { shouldValidate: true },
                              );
                            }
                          },
                        },
                      )}
                    />
                  </FormField>
                </div>
                <FormField label="Product Link">
                  <div className="relative">
                    <Link className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      className="h-9 pl-9 text-[12px]"
                      type="url"
                      placeholder="https://www.lazada.com.ph/products/..."
                      {...register(
                        `items.${itemIndex}.sellerReferences.${si}.url`,
                      )}
                    />
                  </div>
                </FormField>
                <FormField label="Notes">
                  <Input
                    className="h-9 text-[12px]"
                    placeholder="e.g. includes shipping, 1yr warranty"
                    {...register(
                      `items.${itemIndex}.sellerReferences.${si}.notes`,
                    )}
                  />
                </FormField>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Justification (fewer than 3 sellers) ─────────── */}
      {needsJustification && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-[12px] font-semibold text-amber-800">
              Justification required
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700/80 leading-relaxed">
            Approvers need to know why this item has fewer than 3 sellers.
          </p>
          <div className="mt-2.5">
            <FormField error={itemErrors?.sellerReferencesJustification?.message}>
              <textarea
                rows={2}
                className={`${premiumTextareaClass} border-amber-200 bg-white focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.10)]`}
                placeholder="e.g. Only one supplier carries this specific model in the Philippines..."
                {...register(
                  `items.${itemIndex}.sellerReferencesJustification`,
                )}
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}
