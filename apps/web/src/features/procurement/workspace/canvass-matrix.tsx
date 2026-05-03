import { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Trophy, TrendingDown, AlertTriangle, Info, CheckCircle, Upload, Paperclip, Eye, Download, Loader2, Camera } from 'lucide-react';
import { formatCurrency, canPreviewAttachment } from './utils';
import type { DraftCanvassEntry } from './use-canvass';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProcItem = any;

interface AttachmentItem {
  _id: string;
  originalName: string;
  mimeType: string;
  canvassEntryId?: string | null;
}

interface CanvassMatrixProps {
  procItems: ProcItem[];
  entries: DraftCanvassEntry[];
  suppliers: Array<{ _id: string; companyName: string }>;
  canvassJustification: string;
  onJustificationChange: (v: string) => void;
  onAddEntry: (supplierId?: string, quotedPrices?: Record<string, string>, remarks?: string, pendingFile?: File | null) => void;
  onRemoveEntry: (localId: string) => void;
  onUpdateEntry: (localId: string, patch: Partial<DraftCanvassEntry>) => void;
  onSetWinner: (localId: string) => void;
  quotationAttachments?: AttachmentItem[];
  onUploadEvidence?: (file: File, canvassEntryId: string) => Promise<void>;
  onRemoveEvidence?: (attachmentId: string) => Promise<void>;
  onPreviewAttachment?: (id: string, mimeType: string, name: string) => void;
  onDownloadAttachment?: (attachmentId: string, name: string) => void;
  isUploadingEvidence?: boolean;
  onViewItemPhoto?: (itemId: string) => void;
  justificationError?: boolean;
}

export interface CanvassMatrixHandle {
  focusJustification: () => void;
}

export const CanvassMatrix = forwardRef<CanvassMatrixHandle, CanvassMatrixProps>(function CanvassMatrix({
  procItems, entries, suppliers,
  canvassJustification, onJustificationChange,
  onAddEntry, onRemoveEntry, onUpdateEntry, onSetWinner,
  quotationAttachments = [], onUploadEvidence, onRemoveEvidence,
  onPreviewAttachment, onDownloadAttachment, isUploadingEvidence,
  onViewItemPhoto, justificationError,
}, ref) {
  const justificationRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focusJustification: () => {
      justificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => justificationRef.current?.focus(), 300);
    },
  }));
  const uploadingEntryRef = useRef<string | null>(null);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addSupplierId, setAddSupplierId] = useState('');
  const [addPrices, setAddPrices] = useState<Record<string, string>>({});
  const [addRemarks, setAddRemarks] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addAttempted, setAddAttempted] = useState(false);
  const usedSupplierIds = new Set(entries.map((e) => e.supplierId).filter(Boolean));
  // Find cheapest and most expensive supplier per item
  const cheapestPerItem: Record<string, string> = {};
  const highestPerItem: Record<string, string> = {};
  for (const item of procItems) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minLocalId = '';
    let maxLocalId = '';
    for (const entry of entries) {
      const price = Number(entry.quotedPrices[item._id]);
      if (price > 0) {
        if (price < minPrice) { minPrice = price; minLocalId = entry.localId; }
        if (price > maxPrice) { maxPrice = price; maxLocalId = entry.localId; }
      }
    }
    if (minLocalId) cheapestPerItem[item._id] = minLocalId;
    const pricedCount = entries.filter((e) => Number(e.quotedPrices[item._id]) > 0).length;
    if (maxLocalId && pricedCount >= 2 && maxLocalId !== minLocalId) {
      highestPerItem[item._id] = maxLocalId;
    }
  }

  // Compute totals per entry for savings
  const totals = entries.map((entry) =>
    procItems.reduce((sum: number, item: ProcItem) => {
      const price = Number(entry.quotedPrices[item._id]) || 0;
      return sum + price * item.quantity;
    }, 0),
  );

  const winnerIdx = entries.findIndex((e) => e.isSelected);
  const winnerTotal = winnerIdx >= 0 ? totals[winnerIdx] : 0;

  // Find next-best (cheapest non-winner total with all prices filled)
  let nextBestTotal = 0;
  if (winnerTotal > 0) {
    const candidates = totals
      .map((t, i) => ({ total: t, idx: i }))
      .filter(({ idx }) => idx !== winnerIdx && totals[idx] > 0);
    if (candidates.length > 0) {
      nextBestTotal = Math.min(...candidates.map((c) => c.total));
    }
  }
  const savings = nextBestTotal > 0 && winnerTotal > 0 ? nextBestTotal - winnerTotal : 0;

  // Lowest total
  const lowestTotal = totals.filter((t) => t > 0).length > 0 ? Math.min(...totals.filter((t) => t > 0)) : 0;
  const winnerAboveCheapestPercent = winnerTotal > 0 && lowestTotal > 0 && winnerTotal !== lowestTotal
    ? ((winnerTotal - lowestTotal) / lowestTotal * 100).toFixed(1)
    : null;

  // All prices filled check
  const allItemsQuoted = entries.length > 0 && entries.every((entry) =>
    procItems.every((item: ProcItem) => Number(entry.quotedPrices[item._id]) > 0),
  );

  // Selection state
  const hasSelection = entries.some((e) => e.isSelected && e.supplierId);
  const isOnlySupplier = entries.filter((e) => e.supplierId).length === 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-body-lg font-semibold text-zinc-900">Supplier Comparison</h3>
            <p className="text-label text-zinc-400 mt-0.5">
              Quote every item per supplier. <span className="text-emerald-600">Green</span> = lowest price. <span className="text-red-500">Red</span> = highest.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-label h-8" onClick={() => { setAddSupplierId(''); setAddPrices({}); setAddRemarks(''); setAddFile(null); setAddAttempted(false); setAddSupplierOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add Supplier
          </Button>
        </div>

        {/* Comparison Intelligence Chips */}
        {entries.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {allItemsQuoted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-caption text-emerald-700">
                All required items quoted
              </span>
            )}
            {hasSelection && isOnlySupplier && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-1 text-caption text-blue-700">
                <Info className="h-3 w-3" /> Single supplier — justification required
              </span>
            )}
            {winnerAboveCheapestPercent && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2 py-1 text-caption text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Selected is +{winnerAboveCheapestPercent}% above cheapest
              </span>
            )}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-caption text-emerald-700">
                <TrendingDown className="h-3 w-3" /> {formatCurrency(savings)} savings vs next best
              </span>
            )}
            {!hasSelection && entries.some((e) => e.supplierId) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2 py-1 text-caption text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Winner selection required
              </span>
            )}
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-t border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-2.5 text-caption font-semibold uppercase tracking-[0.06em] text-zinc-400 w-[280px] min-w-[280px]">Item</th>
                <th className="text-left px-5 py-2.5 text-caption font-semibold uppercase tracking-[0.06em] text-zinc-400 w-[60px]">Qty</th>
                {entries.map((entry, i) => {
                  const supplierName = suppliers.find((s) => s._id === entry.supplierId)?.companyName || `Supplier ${i + 1}`;
                  return (
                    <th key={entry.localId} className={`text-left px-4 py-2.5 min-w-[190px] ${entry.isSelected ? 'bg-emerald-50/40' : ''}`}>
                      <div className="space-y-1">
                        <span className="text-label font-semibold text-zinc-800 truncate block">{supplierName}</span>
                        <div className="flex items-center gap-1">
                          {entry.isSelected && entry.supplierId && !isOnlySupplier && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0 text-micro font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                              <Trophy className="h-2.5 w-2.5" /> Winner
                            </span>
                          )}
                          {entry.isSelected && entry.supplierId && isOnlySupplier && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0 text-micro font-semibold text-blue-600 border border-blue-100 shrink-0">
                              Only Supplier
                            </span>
                          )}
                          {!entry.isSelected && (
                            <Button
                              type="button" size="sm" variant="ghost"
                              className="h-6 text-micro px-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              onClick={() => onSetWinner(entry.localId)}
                            >
                              <Trophy className="h-3 w-3" /> Set Winner
                            </Button>
                          )}
                          {entries.length > 1 && (
                            <Button
                              type="button" size="icon" variant="ghost"
                              className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Remove supplier"
                              onClick={() => onRemoveEntry(entry.localId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {procItems.map((item: ProcItem) => (
                <tr key={item._id} className="border-b border-zinc-100/60 last:border-0 hover:bg-zinc-50/40 transition-colors duration-150">
                  <td className="px-5 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-label text-zinc-800">{item.description}</p>
                        {item.specifications && (
                          <Tooltip.Provider delayDuration={200}>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <p className="text-caption text-zinc-400 mt-0.5 line-clamp-1 cursor-default">{item.specifications}</p>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  side="bottom"
                                  sideOffset={4}
                                  className="z-50 max-w-[320px] rounded-lg border border-zinc-800/60 bg-zinc-900 px-3 py-1.5 text-label font-medium text-white shadow-modal animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
                                >
                                  {item.specifications}
                                  <Tooltip.Arrow className="fill-zinc-900" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        )}
                      </div>
                      {item.referencePhotoPath && onViewItemPhoto && (
                        <button
                          type="button"
                          onClick={() => onViewItemPhoto(item._id)}
                          className="shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-micro text-zinc-500 hover:bg-zinc-100 transition-colors duration-150"
                        >
                          <Camera className="h-2.5 w-2.5" /> Photo
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-label text-zinc-400 tabular-nums">
                    {item.quantity} {item.unit}
                  </td>
                  {entries.map((entry) => {
                    const price = Number(entry.quotedPrices[item._id]) || 0;
                    const isCheapest = cheapestPerItem[item._id] === entry.localId && price > 0;
                    const isHighest = highestPerItem[item._id] === entry.localId && price > 0;
                    const lineTotal = price * item.quantity;
                    return (
                      <td
                        key={entry.localId}
                        className={`px-4 py-2.5 ${entry.isSelected ? 'bg-emerald-50/30' : ''} ${isCheapest ? 'bg-emerald-50/50' : ''} ${isHighest ? 'bg-red-50/30' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-caption text-zinc-400 font-medium">P</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              className={`h-8 text-label pl-7 tabular-nums bg-white ${isCheapest ? 'border-emerald-300 focus-visible:ring-emerald-300' : ''} ${isHighest ? 'border-red-200 focus-visible:ring-red-200' : ''}`}
                              value={entry.quotedPrices[item._id] ?? ''}
                              onChange={(e) => {
                                // Allow only digits and one decimal point
                                let v = e.target.value.replace(/[^\d.]/g, '');
                                const dot = v.indexOf('.');
                                if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
                                // Strip leading zeros before a non-zero digit
                                v = v.replace(/^0+([1-9])/, '$1');
                                onUpdateEntry(entry.localId, {
                                  quotedPrices: { ...entry.quotedPrices, [item._id]: v },
                                });
                              }}
                            />
                          </div>
                          {price > 0 && (
                            <p className={`text-micro tabular-nums ${isCheapest ? 'text-emerald-700 font-semibold' : isHighest ? 'text-red-500' : 'text-zinc-400'}`}>
                              = {formatCurrency(lineTotal)}
                            </p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Notes & evidence row */}
              <tr className="border-t border-zinc-100 bg-zinc-50/30">
                <td className="px-5 py-2.5 text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 align-top pt-3" colSpan={2}>Notes & Evidence</td>
                {entries.map((entry) => {
                  const entryId = entry.localId;
                  const entryAttachments = quotationAttachments.filter((att) => att.canvassEntryId === entryId);
                  return (
                    <td key={entry.localId} className={`px-4 py-2.5 align-top max-w-[1px] ${entry.isSelected ? 'bg-emerald-50/30' : ''}`}>
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          className="flex w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-caption shadow-xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none transition-shadow duration-150"
                          placeholder="Lead time, warranty, payment terms..."
                          value={entry.remarks}
                          onChange={(e) => onUpdateEntry(entry.localId, { remarks: e.target.value })}
                        />
                        {entryAttachments.length > 0 && (
                          <div className="space-y-1">
                            {entryAttachments.map((att) => (
                              <div key={att._id} className="flex items-center gap-1.5 rounded-md border border-zinc-100 bg-zinc-50/60 px-2 py-1 text-micro text-zinc-600 group overflow-hidden">
                                <Paperclip className="h-2.5 w-2.5 shrink-0 text-zinc-300" />
                                <span className="truncate flex-1 min-w-0">{att.originalName}</span>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {onPreviewAttachment && canPreviewAttachment(att.mimeType) && (
                                    <button onClick={() => onPreviewAttachment(att._id, att.mimeType, att.originalName)}
                                      className="h-4 w-4 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                                      <Eye className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                  {onDownloadAttachment && (
                                    <button onClick={() => onDownloadAttachment(att._id, att.originalName)}
                                      className="h-4 w-4 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                                      <Download className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                  {onRemoveEvidence && (
                                    <button onClick={() => onRemoveEvidence(att._id)}
                                      className="h-4 w-4 rounded flex items-center justify-center text-red-400 hover:text-red-600">
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {onUploadEvidence && (
                          <label className="inline-flex items-center gap-1 text-micro text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                              className="hidden"
                              disabled={isUploadingEvidence}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) {
                                  uploadingEntryRef.current = entryId;
                                  await onUploadEvidence(file, entryId);
                                  uploadingEntryRef.current = null;
                                }
                              }}
                            />
                            {isUploadingEvidence && uploadingEntryRef.current === entryId
                              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              : <Upload className="h-2.5 w-2.5" />}
                            Attach file
                          </label>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* Totals row */}
              <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
                <td className="px-5 py-3 font-semibold text-label uppercase tracking-[0.06em] text-zinc-400" colSpan={2}>Total</td>
                {entries.map((entry, i) => {
                  const total = totals[i];
                  const supplier = suppliers.find((s) => s._id === entry.supplierId);
                  const isLowest = total > 0 && total === lowestTotal && entries.filter((e) => totals[entries.indexOf(e)] > 0).length > 1;
                  return (
                    <td key={entry.localId} className={`px-4 py-3 ${entry.isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {entry.isSelected && total > 0 && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <p className={`text-body-lg font-bold tabular-nums ${entry.isSelected ? 'text-emerald-700' : isLowest ? 'text-emerald-600' : 'text-zinc-800'}`}>
                          {total > 0 ? formatCurrency(total) : '\u2014'}
                        </p>
                      </div>
                      {supplier && <p className="text-micro text-zinc-400 mt-0.5">{supplier.companyName}</p>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Justification for fewer than 3 */}
      {entries.length < 3 && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-card p-5 space-y-2">
          <div>
            <h4 className="text-body font-semibold text-amber-900">Justification for Fewer than 3 Suppliers</h4>
            <p className="text-caption text-amber-700/70 mt-0.5">Explain why only one or two suppliers could be canvassed</p>
          </div>
          <textarea
            ref={justificationRef}
            rows={3}
            className={`flex w-full rounded-lg border bg-white px-3 py-2.5 text-body shadow-xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 resize-none transition-all duration-150 ${
              justificationError ? 'border-red-400 focus-visible:ring-red-300' : 'border-amber-300 focus-visible:ring-amber-300'
            }`}
            placeholder="e.g. Only one authorized dealer in the Philippines for this product, or sole-source OEM requirement..."
            value={canvassJustification}
            onChange={(e) => onJustificationChange(e.target.value)}
          />
          {justificationError && (
            <p className="text-micro text-red-500 font-medium">Required before submission</p>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="sm:max-w-[560px]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-body-lg">Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-label text-zinc-500 mb-2">Select a supplier and enter quoted prices.</p>
              <Select value={addSupplierId || 'none'} onValueChange={(v) => setAddSupplierId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-body">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select supplier</SelectItem>
                  {suppliers.filter((s) => !usedSupplierIds.has(s._id)).map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addSupplierId && (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_120px_80px] gap-2 px-1 pb-1">
                  <p className="text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400">Item</p>
                  <p className="text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 text-right">Price / Unit</p>
                  <p className="text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 text-right">Line Total</p>
                </div>
                {procItems.map((item: ProcItem) => {
                  const unitPrice = Number(addPrices[item._id]) || 0;
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div key={item._id} className="grid grid-cols-[1fr_120px_80px] gap-2 items-center rounded-lg px-1 py-1.5 hover:bg-zinc-50/60">
                      <div className="min-w-0">
                        <p className="text-label font-medium text-zinc-700 truncate">{item.description}</p>
                        <p className="text-micro text-zinc-400">
                          {item.quantity} {item.unit}
                          {item.estimatedPrice > 0 && <span className="ml-1">· Est. {formatCurrency(item.estimatedPrice)}/{item.unit}</span>}
                        </p>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-caption text-zinc-400 font-medium">₱</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`h-8 text-label pl-7 tabular-nums ${addAttempted && (!addPrices[item._id] || unitPrice <= 0) ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                          value={addPrices[item._id] ?? ''}
                          onChange={(e) => {
                            let v = e.target.value.replace(/[^\d.]/g, '');
                            const dot = v.indexOf('.');
                            if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
                            v = v.replace(/^0+([1-9])/, '$1');
                            setAddPrices((prev) => ({ ...prev, [item._id]: v }));
                          }}
                        />
                      </div>
                      <p className={`text-label tabular-nums text-right ${lineTotal > 0 ? 'text-zinc-700 font-medium' : 'text-zinc-300'}`}>
                        {lineTotal > 0 ? formatCurrency(lineTotal) : '—'}
                      </p>
                    </div>
                  );
                })}
                {(() => {
                  const grandTotal = procItems.reduce((sum: number, item: ProcItem) => sum + (Number(addPrices[item._id]) || 0) * item.quantity, 0);
                  return grandTotal > 0 ? (
                    <div className="grid grid-cols-[1fr_120px_80px] gap-2 items-center border-t border-zinc-200 mt-1 pt-2 px-1">
                      <p className="text-caption font-semibold text-zinc-500">Grand Total</p>
                      <div />
                      <p className="text-body font-bold tabular-nums text-zinc-900 text-right">{formatCurrency(grandTotal)}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {addSupplierId && (
              <>
                <div>
                  <p className="text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 mb-1.5">Remarks</p>
                  <textarea
                    rows={2}
                    className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-label shadow-xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none"
                    placeholder="Lead time, warranty, payment terms..."
                    value={addRemarks}
                    onChange={(e) => setAddRemarks(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-micro font-semibold uppercase tracking-[0.06em] text-zinc-400 mb-1.5">Quotation Evidence</p>
                  {addFile ? (
                    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2">
                      <Paperclip className="h-3 w-3 text-zinc-400 shrink-0" />
                      <span className="text-label text-zinc-700 truncate flex-1">{addFile.name}</span>
                      <button onClick={() => setAddFile(null)} className="text-micro text-red-500 hover:text-red-700 shrink-0">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50/30 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden"
                        onChange={(e) => { setAddFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                      <Upload className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-label text-zinc-500">Attach PDF or image</span>
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
          {addAttempted && addSupplierId && !procItems.every((item: ProcItem) => Number(addPrices[item._id]) > 0) && (
            <p className="text-caption text-red-500">All item prices are required.</p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-label" onClick={() => setAddSupplierOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-label" disabled={!addSupplierId} onClick={() => {
              setAddAttempted(true);
              if (!procItems.every((item: ProcItem) => Number(addPrices[item._id]) > 0)) return;
              onAddEntry(addSupplierId, addPrices, addRemarks, addFile);
              setAddSupplierOpen(false);
            }}>
              <Plus className="h-3.5 w-3.5" /> Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
