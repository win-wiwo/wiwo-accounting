import { useState } from 'react';
import { Controller, type UseFormReturn, type UseFieldArrayReturn } from 'react-hook-form';
import { SourcingType } from '@prams/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ShoppingCart, Globe, ChevronDown, ChevronUp } from 'lucide-react';
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
  form, fields, append, remove,
  totalAmount, hasProcurementItems,
  stagedFiles, prData, serverPhotoPreviews,
}: StepItemsProps) {
  const { register, watch, control, formState: { errors } } = form;
  const watchItems = watch('items');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Line Items</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Add items you need. Click <strong>"Add details"</strong> to add sourcing info, specs, and photos.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              append(defaultItem());
              // Auto-expand new item
              setExpandedItems((prev) => ({ ...prev, [fields.length]: true }));
            }}
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
            const isExpanded = expandedItems[index] ?? false;

            return (
              <div key={field.id} className="rounded-lg border p-4 space-y-4">
                {/* Item header */}
                <div className="flex items-center justify-between">
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

                {/* Always-visible: Description, Qty, Unit */}
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1 sm:col-span-7">
                    <Label className="text-xs">Description *</Label>
                    <Input placeholder="What item do you need?" {...register(`items.${index}.description`)} />
                    {itemErrors?.description && (
                      <p className="text-xs text-destructive">{itemErrors.description.message}</p>
                    )}
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" min={1} {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                    {itemErrors?.quantity && (
                      <p className="text-xs text-destructive">{itemErrors.quantity.message}</p>
                    )}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Unit *</Label>
                    <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                    {itemErrors?.unit && (
                      <p className="text-xs text-destructive">{itemErrors.unit.message}</p>
                    )}
                  </div>
                </div>

                {/* Specifications — always visible since required */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Specifications <span className="text-destructive">*</span>
                    {!isOnline && <span className="text-muted-foreground ml-1">(helps Procurement source the right item)</span>}
                  </Label>
                  <textarea
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Exact model, brand, dimensions, capacity, color, etc."
                    {...register(`items.${index}.specifications`)}
                  />
                  {itemErrors?.specifications && (
                    <p className="text-xs text-destructive">{itemErrors.specifications.message}</p>
                  )}
                </div>

                {/* Expand/collapse toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => toggleExpand(index)}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isExpanded ? 'Hide details' : 'Sourcing, price & photos'}
                  {isOnline && !isExpanded && (
                    <span className="ml-1 text-blue-600">· Online sourced</span>
                  )}
                </Button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="space-y-4 border-t pt-4">
                    {/* Sourcing type */}
                    <div className="space-y-2">
                      <Label className="text-xs">Sourcing</Label>
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

                    {/* Price (online only) */}
                    {isOnline && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Unit Price (PHP) *</Label>
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
                        <div className="flex items-end">
                          <div className="w-full rounded-md bg-muted/50 px-3 py-2 text-right text-sm font-medium">
                            Line total: {formatCurrency(lineTotal)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reference Photo */}
                    {(() => {
                      const itemId = watch(`items.${index}._id`);
                      const serverItem = itemId ? prData?.data?.items?.find((i: { _id: string }) => i._id === itemId) : null;
                      return (
                        <ItemPhotoWidget
                          index={index}
                          staged={stagedFiles.stagedPhotos[index] ?? null}
                          serverPhotoName={serverItem?.referencePhotoOriginalName ?? null}
                          serverPhotoPreviewUrl={itemId ? (serverPhotoPreviews[itemId] ?? null) : null}
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
                        <Separator />
                        <SellerReferencesSection itemIndex={index} form={form} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {hasProcurementItems && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Procurement-sourced items will be priced after Procurement team quotes them.
                  </p>
                  <p>
                    Add clear specs, notes, and item photos now so Procurement can canvass without sending this back.
                  </p>
                </div>
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
    </div>
  );
}
