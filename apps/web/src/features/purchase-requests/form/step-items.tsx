import { useEffect, useState } from 'react';
import {
  Controller,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from 'react-hook-form';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ShoppingCart,
  Globe,
  Package,
  Tag,
} from 'lucide-react';
import { SourcingType } from '@prams/shared';
import { Input } from '@/components/ui/input';
import {
  Surface,
  FormField,
  PrimaryButton,
  StatusBadge,
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
  stagedFiles: ReturnType<typeof useStagedFiles>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prData: { data?: any } | undefined;
  serverPhotoPreviews: Record<string, string>;
  selectedSellerIndexes: Record<number, number>;
  onSelectedSellerIndexesChange: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}

export function StepItems({
  form,
  fields,
  append,
  remove,
  totalAmount,
  stagedFiles,
  prData,
  serverPhotoPreviews,
  selectedSellerIndexes,
  onSelectedSellerIndexesChange,
}: StepItemsProps) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;
  const watchItems = watch('items');
  const sourcingMode = watch('sourcingMode');
  const [clearedServerPhotos, setClearedServerPhotos] = useState<Set<number>>(new Set());

  // Lock the sourcing mode once a real item has been entered. The form may
  // start with a placeholder item; we only lock when the user has actually
  // filled in any details (description, price, or seller refs).
  const sourcingModeLocked = (watchItems ?? []).some((item) =>
    Boolean(
      item?.description?.trim() ||
        (item?.estimatedPrice ?? 0) > 0 ||
        (item?.sellerReferences?.length ?? 0) > 0,
    ),
  );

  // Keep placeholder items in sync with the chosen sourcing mode so they pass
  // validation. The lock above guarantees this only runs while items are blank.
  useEffect(() => {
    if (!sourcingMode) return;
    (watchItems ?? []).forEach((item, index) => {
      if (item && item.sourcingType !== sourcingMode) {
        setValue(`items.${index}.sourcingType`, sourcingMode, { shouldValidate: false, shouldDirty: false });
      }
    });
  }, [sourcingMode, watchItems, setValue]);

  const handleSelectSeller = (itemIndex: number, sellerIndex: number) => {
    onSelectedSellerIndexesChange((prev) => ({ ...prev, [itemIndex]: sellerIndex }));
    const price = watchItems?.[itemIndex]?.sellerReferences?.[sellerIndex]?.price ?? 0;
    setValue(`items.${itemIndex}.estimatedPrice`, price, { shouldValidate: true });
  };

  const handleRemoveSeller = (itemIndex: number, sellerIndex: number) => {
    const current = selectedSellerIndexes[itemIndex];
    if (current === sellerIndex) {
      onSelectedSellerIndexesChange((prev) => {
        const next = { ...prev };
        delete next[itemIndex];
        return next;
      });
      setValue(`items.${itemIndex}.estimatedPrice`, 0, { shouldValidate: true });
    } else if (current !== undefined && sellerIndex < current) {
      onSelectedSellerIndexesChange((prev) => ({ ...prev, [itemIndex]: current - 1 }));
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Sourcing picker — sets the mode for all line items ───── */}
      <Surface delay={0.02}>
        <div className="px-6 pt-6 pb-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <ShoppingCart className="h-4 w-4 text-zinc-400" />
            Sourcing
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
            {sourcingModeLocked
              ? 'Sourcing mode is locked once items have content. Clear the items below to change it.'
              : 'Choose how the items below will be sourced. All items in this PR share the same mode.'}
          </p>
        </div>
        <div className="px-6 pb-6 pt-3">
          <Controller
            control={control}
            name="sourcingMode"
            render={({ field }) => (
              <div className={cn('grid gap-3 sm:grid-cols-2', sourcingModeLocked && 'opacity-60 pointer-events-none')}>
                <SourcingModeCard
                  selected={field.value === SourcingType.PROCUREMENT}
                  onClick={() => !sourcingModeLocked && field.onChange(SourcingType.PROCUREMENT)}
                  icon={<ShoppingCart className="h-4 w-4" />}
                  title="Procurement"
                  description="Procurement canvasses suppliers and picks the winning quote."
                />
                <SourcingModeCard
                  selected={field.value === SourcingType.ONLINE}
                  onClick={() => !sourcingModeLocked && field.onChange(SourcingType.ONLINE)}
                  icon={<Globe className="h-4 w-4" />}
                  title="Online"
                  description="Items purchased online — requester picks the seller per item."
                />
              </div>
            )}
          />
        </div>
      </Surface>

      <Surface delay={0.04}>
        {/* ── Section header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
              <Package className="h-4 w-4 text-zinc-400" />
              Line Items
            </h2>
            <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
              {sourcingMode === SourcingType.ONLINE
                ? 'Add items to be purchased online. List 3 sellers per item (or justify fewer).'
                : 'Add items procurement will canvass. Specs and reference photos help suppliers quote accurately.'}
            </p>
          </div>
          <PrimaryButton
            type="button"
            onClick={() => append(defaultItem(sourcingMode))}
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </PrimaryButton>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {errors.items &&
            typeof errors.items === 'object' &&
            'message' in errors.items && (
              <p className="text-[12px] text-red-600">
                {errors.items.message as string}
              </p>
            )}

          {fields.map((field, index) => {
            const item = watchItems?.[index];
            // Source-of-truth is PR-level sourcingMode; every item inherits it.
            const isOnline = sourcingMode === SourcingType.ONLINE;
            const qty = Number(item?.quantity) || 0;
            const price = isOnline ? Number(item?.estimatedPrice) || 0 : 0;
            const lineTotal = qty * price;
            const itemErrors = errors.items?.[index] as
              | Record<string, { message?: string }>
              | undefined;

            return (
              <ItemCard
                key={field.id}
                index={index}
                isOnline={isOnline}
                lineTotal={lineTotal}
                itemDescription={item?.description}
                showRemove={fields.length > 1}
                onRemove={() => remove(index)}
              >
                {/* ── Item Details ─────────────────────── */}
                <ItemSection title="Item Details">
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
                        onFocus={(e) => {
                          if (e.target.value === '0') e.target.value = '';
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') e.target.value = '1';
                        }}
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (!/^\d+$/.test(text.trim())) e.preventDefault();
                        }}
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                            const raw = e.target.value;
                            if (raw.length > 1 && raw.startsWith('0')) {
                              e.target.value = raw.replace(/^0+/, '') || '1';
                            }
                          },
                        })}
                      />
                    </FormField>
                    <FormField
                      label="Unit"
                      required
                      className="sm:col-span-2"
                      error={itemErrors?.unit?.message}
                    >
                      <Input
                        placeholder="pcs"
                        {...register(`items.${index}.unit`)}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Specifications"
                    required
                    error={itemErrors?.specifications?.message}
                    help={
                      !isOnline
                        ? 'Helps Procurement source the right item — model, brand, dimensions, capacity.'
                        : 'Exact model, brand, dimensions, capacity, color.'
                    }
                  >
                    <textarea
                      rows={2}
                      className={premiumTextareaClass}
                      placeholder="Exact model, brand, dimensions, capacity, color, etc."
                      {...register(`items.${index}.specifications`)}
                    />
                  </FormField>
                </ItemSection>

                {/* ── Pricing & Sourcing ───────────────── */}
                <ItemSection title="Pricing & Sourcing">
                  {isOnline && (
                    <UnitPriceDisplay
                      selectedSellerIndex={selectedSellerIndexes[index]}
                      sellerReferences={item?.sellerReferences}
                      error={itemErrors?.estimatedPrice?.message}
                    />
                  )}

                  <FormField label="Reference Photo">
                    {(() => {
                      const itemId = watch(`items.${index}._id`);
                      const serverItem = itemId
                        ? prData?.data?.items?.find(
                            (i: { _id: string }) => i._id === itemId,
                          )
                        : null;
                      return (
                        <ItemPhotoWidget
                          index={index}
                          staged={stagedFiles.stagedPhotos[index] ?? null}
                          serverPhotoName={
                            clearedServerPhotos.has(index)
                              ? null
                              : (serverItem?.referencePhotoOriginalName ?? null)
                          }
                          serverPhotoPreviewUrl={
                            clearedServerPhotos.has(index)
                              ? null
                              : itemId ? (serverPhotoPreviews[itemId] ?? null) : null
                          }
                          onViewServer={() => {
                            const url = itemId
                              ? serverPhotoPreviews[itemId]
                              : null;
                            if (url)
                              stagedFiles.setPhotoViewDialog({ open: true, url });
                          }}
                          onStage={stagedFiles.stagePhoto}
                          onClearStaged={stagedFiles.clearStagedPhoto}
                          onClearServer={(i) =>
                            setClearedServerPhotos((prev) => new Set(prev).add(i))
                          }
                        />
                      );
                    })()}
                  </FormField>
                </ItemSection>

                {/* ── Supplier References (online only) ── */}
                {isOnline && (
                  <SellerReferencesSection
                    itemIndex={index}
                    form={form}
                    selectedSellerIndex={selectedSellerIndexes[index]}
                    onSelectSeller={(si) => handleSelectSeller(index, si)}
                    onRemoveSeller={(si) => handleRemoveSeller(index, si)}
                  />
                )}
              </ItemCard>
            );
          })}

          {/* ── Cumulative summary footer ──────────── */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-6 py-4">
            <div className="text-[12px] text-zinc-500 leading-relaxed pr-4">
              {sourcingMode === SourcingType.PROCUREMENT ? (
                <>
                  <p className="flex items-center gap-1.5 font-medium text-zinc-700">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Procurement-sourced items
                  </p>
                  <p className="mt-0.5">
                    Final pricing determined after Procurement canvasses suppliers.
                    Add clear specs and photos to avoid rework.
                  </p>
                </>
              ) : (
                <p>Total reflects all online items at entered prices.</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {sourcingMode === SourcingType.PROCUREMENT ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Pricing
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-amber-600">
                    TBQ
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Total Amount
                  </p>
                  <p className="mt-1 text-[22px] font-bold text-zinc-900 tabular-nums">
                    {formatCurrency(totalAmount)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}

/* ── Sourcing mode picker card ─────────────────────────────────
 * Top-of-step radio that drives the mode for every line item below.
 * Mirrors RequestTypeCard styling from step-basics.
 */
interface SourcingModeCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function SourcingModeCard({ selected, onClick, icon, title, description }: SourcingModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2',
        selected
          ? 'border-zinc-800/85 bg-zinc-50/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_12px_rgba(0,0,0,0.04)]'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          selected
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200/80',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-900 leading-tight">{title}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">{description}</p>
      </div>
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
          selected ? 'bg-zinc-800' : 'border border-zinc-300 bg-white group-hover:border-zinc-400',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

/* ── Item card ─────────────────────────────────────────────────
 * Collapsible wrapper with header strip showing item number,
 * sourcing badge, line total, and collapse/delete controls.
 */
interface ItemCardProps {
  index: number;
  isOnline: boolean;
  lineTotal: number;
  itemDescription?: string;
  showRemove: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}

function ItemCard({
  index,
  isOnline,
  lineTotal,
  itemDescription,
  showRemove,
  onRemove,
  children,
}: ItemCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white transition-colors duration-150 hover:border-zinc-300">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-zinc-800">
                Item {index + 1}
              </p>
              {isOnline ? (
                <StatusBadge tone="info">
                  <Globe className="mr-1 h-2.5 w-2.5" />
                  Online
                </StatusBadge>
              ) : (
                <StatusBadge tone="violet">
                  <ShoppingCart className="mr-1 h-2.5 w-2.5" />
                  Procurement
                </StatusBadge>
              )}
            </div>
            {collapsed && itemDescription && (
              <p className="mt-0.5 text-[11px] text-zinc-500 truncate max-w-xs">
                {itemDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 leading-none">
              {isOnline ? 'Line total' : 'Pricing'}
            </p>
            <p
              className={cn(
                'mt-1 text-[14px] font-bold tabular-nums leading-none',
                isOnline ? 'text-zinc-900' : 'text-amber-600',
              )}
            >
              {isOnline ? formatCurrency(lineTotal) : 'TBQ'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            aria-label={collapsed ? 'Expand item' : 'Collapse item'}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {showRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              aria-label={`Remove item ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-zinc-100">{children}</div>
      )}
    </div>
  );
}

/* ── Item card — internal section with label ─────────────────── */

function ItemSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {title}
      </p>
      {children}
    </div>
  );
}

/* ── Unit Price Display ────────────────────────────────────────
 * Read-only derived display for online items. Price comes from
 * the selected seller — never typed twice.
 */
interface UnitPriceDisplayProps {
  selectedSellerIndex: number | undefined;
  sellerReferences: Array<{ sellerName: string; price: number }> | undefined;
  error?: string;
}

function UnitPriceDisplay({
  selectedSellerIndex,
  sellerReferences,
  error,
}: UnitPriceDisplayProps) {
  const selectedSeller =
    selectedSellerIndex !== undefined
      ? sellerReferences?.[selectedSellerIndex]
      : undefined;

  return (
    <FormField
      label="Unit Price (PHP)"
      error={error}
    >
      {selectedSeller ? (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-bold text-zinc-900 tabular-nums leading-none">
              {formatCurrency(selectedSeller.price)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate">
                From: <span className="font-medium text-zinc-700">{selectedSeller.sellerName || 'Selected seller'}</span>
              </span>
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            auto-filled
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100">
            <Tag className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-zinc-600">
              No seller selected yet
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Select a seller below — their price will fill here automatically.
            </p>
          </div>
        </div>
      )}
    </FormField>
  );
}
