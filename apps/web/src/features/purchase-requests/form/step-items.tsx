import { useState } from 'react';
import {
  Controller,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from 'react-hook-form';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SourcingType } from '@prams/shared';
import { Input } from '@/components/ui/input';
import {
  Surface,
  FormField,
  GhostButton,
  premiumTextareaClass,
} from '@/components/premium';
import { cn } from '@/lib/utils';
import type { FormData } from './schemas';
import { defaultItem } from './schemas';
import { formatCurrency } from './utils';
import { SellerReferencesSection } from './seller-references-section';
import { ItemPhotoWidget } from './item-photo-widget';
import type { useStagedFiles } from './use-staged-files';

interface StepItemsProps {
  form: UseFormReturn<FormData>;
  fields: UseFieldArrayReturn<FormData, 'items'>['fields'];
  append: UseFieldArrayReturn<FormData, 'items'>['append'];
  remove: UseFieldArrayReturn<FormData, 'items'>['remove'];
  totalAmount: number;
  hasProcurementItems: boolean;
  stagedFiles: ReturnType<typeof useStagedFiles>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prData: { data?: any } | undefined;
  serverPhotoPreviews: Record<string, string>;
}

export function StepItems({
  form,
  fields,
  append,
  remove,
  totalAmount,
  hasProcurementItems,
  stagedFiles,
  prData,
  serverPhotoPreviews,
}: StepItemsProps) {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = form;
  const watchItems = watch('items');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Surface delay={0.04}>
      <div className="flex flex-row items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-900">Line Items</h2>
          <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
            Add items you need. Click <strong>"Add details"</strong> to add sourcing
            info, specs, and photos.
          </p>
        </div>
        <GhostButton
          type="button"
          onClick={() => {
            append(defaultItem());
            setExpandedItems((prev) => ({ ...prev, [fields.length]: true }));
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Item
        </GhostButton>
      </div>
      <div className="px-6 pb-6 space-y-4">
        {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
          <p className="text-[12px] text-red-600">{errors.items.message as string}</p>
        )}

        {fields.map((field, index) => {
          const item = watchItems?.[index];
          const isOnline = item?.sourcingType === SourcingType.ONLINE;
          const qty = Number(item?.quantity) || 0;
          const price = isOnline ? Number(item?.estimatedPrice) || 0 : 0;
          const lineTotal = qty * price;
          const itemErrors = errors.items?.[index] as
            | Record<string, { message?: string }>
            | undefined;
          const isExpanded = expandedItems[index] ?? false;

          return (
            <div
              key={field.id}
              className="rounded-xl border border-zinc-100 bg-white p-5 space-y-4 transition-colors duration-150 hover:border-zinc-200"
            >
              <div className="flex items-center justify-between">
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

              {/* Always-visible: Description, Qty, Unit */}
              <div className="grid gap-3 sm:grid-cols-12">
                <FormField
                  label="Description"
                  required
                  className="sm:col-span-7"
                  error={itemErrors?.description?.message}
                >
                  <Input
                    placeholder="What item do you need?"
                    {...register(`items.${index}.description`)}
                  />
                </FormField>
                <FormField
                  label="Quantity"
                  required
                  className="sm:col-span-3"
                  error={itemErrors?.quantity?.message}
                >
                  <Input
                    type="number"
                    min={1}
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Unit"
                  required
                  className="sm:col-span-2"
                  error={itemErrors?.unit?.message}
                >
                  <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                </FormField>
              </div>

              {/* Specifications */}
              <FormField
                label="Specifications"
                required
                error={itemErrors?.specifications?.message}
                help={!isOnline ? 'Helps Procurement source the right item.' : undefined}
              >
                <textarea
                  rows={2}
                  className={premiumTextareaClass}
                  placeholder="Exact model, brand, dimensions, capacity, color, etc."
                  {...register(`items.${index}.specifications`)}
                />
              </FormField>

              {/* Expand/collapse toggle */}
              <button
                type="button"
                onClick={() => toggleExpand(index)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {isExpanded ? 'Hide details' : 'Sourcing, price & photos'}
                {isOnline && !isExpanded && (
                  <span className="ml-1 text-blue-600">· Online sourced</span>
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="space-y-4 border-t border-zinc-100 pt-4">
                  {/* Sourcing type */}
                  <FormField label="Sourcing">
                    <Controller
                      control={control}
                      name={`items.${index}.sourcingType`}
                      render={({ field: f }) => (
                        <div className="inline-flex rounded-lg border border-zinc-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => f.onChange(SourcingType.PROCUREMENT)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors duration-150',
                              f.value === SourcingType.PROCUREMENT
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white text-zinc-600 hover:bg-zinc-50',
                            )}
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Procurement
                          </button>
                          <button
                            type="button"
                            onClick={() => f.onChange(SourcingType.ONLINE)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors duration-150',
                              f.value === SourcingType.ONLINE
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-zinc-600 hover:bg-zinc-50',
                            )}
                          >
                            <Globe className="h-3 w-3" />
                            Online
                          </button>
                        </div>
                      )}
                    />
                  </FormField>

                  {/* Price (online only) */}
                  {isOnline && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        label="Unit Price (PHP)"
                        required
                        error={itemErrors?.estimatedPrice?.message}
                      >
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.estimatedPrice`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormField>
                      <div className="flex items-end">
                        <div className="w-full rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 text-right text-[13px] font-semibold text-zinc-800 tabular-nums">
                          Line total: {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference Photo */}
                  {(() => {
                    const itemId = watch(`items.${index}._id`);
                    const serverItem = itemId
                      ? prData?.data?.items?.find((i: { _id: string }) => i._id === itemId)
                      : null;
                    return (
                      <ItemPhotoWidget
                        index={index}
                        staged={stagedFiles.stagedPhotos[index] ?? null}
                        serverPhotoName={serverItem?.referencePhotoOriginalName ?? null}
                        serverPhotoPreviewUrl={
                          itemId ? (serverPhotoPreviews[itemId] ?? null) : null
                        }
                        onViewServer={() => {
                          const url = itemId ? serverPhotoPreviews[itemId] : null;
                          if (url) stagedFiles.setPhotoViewDialog({ open: true, url });
                        }}
                        onStage={stagedFiles.stagePhoto}
                        onClearStaged={stagedFiles.clearStagedPhoto}
                      />
                    );
                  })()}

                  {/* Seller References — online only */}
                  {isOnline && (
                    <>
                      <div className="h-px bg-zinc-100" />
                      <SellerReferencesSection itemIndex={index} form={form} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Total */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-6 py-4">
          <div className="text-[12px] text-zinc-500 leading-relaxed">
            {hasProcurementItems && (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3" />
                  Procurement-sourced items will be priced after Procurement quotes them.
                </p>
                <p>
                  Add clear specs, notes, and item photos now so Procurement can canvass
                  without sending this back.
                </p>
              </div>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {hasProcurementItems ? 'Online items subtotal' : 'Total Amount'}
            </p>
            <p className="mt-1 text-[20px] font-bold text-zinc-900 tabular-nums">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}
