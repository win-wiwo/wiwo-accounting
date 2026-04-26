import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Trophy, TrendingDown, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { formatCurrency } from './utils';
import type { DraftCanvassEntry } from './use-canvass';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProcItem = any;

interface CanvassMatrixProps {
  procItems: ProcItem[];
  entries: DraftCanvassEntry[];
  suppliers: Array<{ _id: string; companyName: string }>;
  canvassJustification: string;
  onJustificationChange: (v: string) => void;
  onAddEntry: () => void;
  onRemoveEntry: (localId: string) => void;
  onUpdateEntry: (localId: string, patch: Partial<DraftCanvassEntry>) => void;
  onSetWinner: (localId: string) => void;
}

export function CanvassMatrix({
  procItems, entries, suppliers,
  canvassJustification, onJustificationChange,
  onAddEntry, onRemoveEntry, onUpdateEntry, onSetWinner,
}: CanvassMatrixProps) {
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
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-900">Supplier Comparison</h3>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Quote every item per supplier. <span className="text-emerald-600">Green</span> = lowest price. <span className="text-red-500">Red</span> = highest.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-[12px] h-8" onClick={onAddEntry}>
            <Plus className="h-3.5 w-3.5" /> Add Supplier
          </Button>
        </div>

        {/* Comparison Intelligence Chips */}
        {entries.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {allItemsQuoted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-[11px] text-emerald-700">
                All required items quoted
              </span>
            )}
            {hasSelection && isOnlySupplier && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-1 text-[11px] text-blue-700">
                <Info className="h-3 w-3" /> Single supplier — justification required
              </span>
            )}
            {winnerAboveCheapestPercent && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2 py-1 text-[11px] text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Selected is +{winnerAboveCheapestPercent}% above cheapest
              </span>
            )}
            {savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-[11px] text-emerald-700">
                <TrendingDown className="h-3 w-3" /> {formatCurrency(savings)} savings vs next best
              </span>
            )}
            {!hasSelection && entries.some((e) => e.supplierId) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2 py-1 text-[11px] text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Winner selection required
              </span>
            )}
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-t border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 w-[200px]">Item</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 w-[60px]">Qty</th>
                {entries.map((entry, i) => {
                  return (
                    <th key={entry.localId} className={`text-left px-4 py-2.5 min-w-[190px] ${entry.isSelected ? 'bg-emerald-50/40' : ''}`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Supplier {i + 1}</span>
                          {entry.isSelected && entry.supplierId && !isOnlySupplier && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                              <Trophy className="h-2.5 w-2.5" /> Winner
                            </span>
                          )}
                          {entry.isSelected && entry.supplierId && isOnlySupplier && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0 text-[9px] font-semibold text-blue-600 border border-blue-100">
                              Only Supplier
                            </span>
                          )}
                        </div>
                        <Select
                          value={entry.supplierId || 'none'}
                          onValueChange={(v) => onUpdateEntry(entry.localId, { supplierId: v === 'none' ? '' : v })}
                        >
                          <SelectTrigger className="h-8 text-[12px] bg-white">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select supplier</SelectItem>
                            {suppliers.map((s) => (
                              <SelectItem key={s._id} value={s._id}>{s.companyName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          {!entry.isSelected && (
                            <Button
                              type="button" size="sm" variant="ghost"
                              className="h-6 text-[10px] px-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
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
                    <p className="font-medium text-[12px] text-zinc-800">{item.description}</p>
                    {item.specifications && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{item.specifications}</p>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-[12px] text-zinc-400 tabular-nums">
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
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-medium">P</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              className={`h-8 text-[12px] pl-7 tabular-nums bg-white ${isCheapest ? 'border-emerald-300 focus-visible:ring-emerald-300' : ''} ${isHighest ? 'border-red-200 focus-visible:ring-red-200' : ''}`}
                              value={entry.quotedPrices[item._id] ?? ''}
                              onChange={(e) => onUpdateEntry(entry.localId, {
                                quotedPrices: { ...entry.quotedPrices, [item._id]: e.target.value },
                              })}
                            />
                          </div>
                          {price > 0 && (
                            <p className={`text-[10px] tabular-nums ${isCheapest ? 'text-emerald-700 font-semibold' : isHighest ? 'text-red-500' : 'text-zinc-400'}`}>
                              = {formatCurrency(lineTotal)}
                            </p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
                <td className="px-5 py-3 font-semibold text-[12px] uppercase tracking-[0.06em] text-zinc-400" colSpan={2}>Total</td>
                {entries.map((entry, i) => {
                  const total = totals[i];
                  const supplier = suppliers.find((s) => s._id === entry.supplierId);
                  const isLowest = total > 0 && total === lowestTotal && entries.filter((e) => totals[entries.indexOf(e)] > 0).length > 1;
                  return (
                    <td key={entry.localId} className={`px-4 py-3 ${entry.isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {entry.isSelected && total > 0 && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <p className={`text-[15px] font-bold tabular-nums ${entry.isSelected ? 'text-emerald-700' : isLowest ? 'text-emerald-600' : 'text-zinc-800'}`}>
                          {total > 0 ? formatCurrency(total) : '\u2014'}
                        </p>
                      </div>
                      {supplier && <p className="text-[10px] text-zinc-400 mt-0.5">{supplier.companyName}</p>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-supplier remarks */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
        <h4 className="text-[13px] font-semibold text-zinc-900 mb-3">Supplier Terms & Notes</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => {
            const supplier = suppliers.find((s) => s._id === entry.supplierId);
            return (
              <div key={entry.localId} className="space-y-1.5">
                <Label className="text-[12px] text-zinc-500">
                  {supplier?.companyName || `Supplier ${i + 1}`}
                </Label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none transition-shadow duration-150"
                  placeholder="Lead time, warranty, payment terms..."
                  value={entry.remarks}
                  onChange={(e) => onUpdateEntry(entry.localId, { remarks: e.target.value })}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Justification for fewer than 3 */}
      {entries.length < 3 && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div>
            <h4 className="text-[13px] font-semibold text-amber-900">Justification for Fewer than 3 Suppliers</h4>
            <p className="text-[11px] text-amber-700/70 mt-0.5">Explain why only one or two suppliers could be canvassed</p>
          </div>
          <textarea
            rows={3}
            className="flex w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-[13px] shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 resize-none transition-shadow duration-150"
            placeholder="e.g. Only one authorized dealer in the Philippines for this product, or sole-source OEM requirement..."
            value={canvassJustification}
            onChange={(e) => onJustificationChange(e.target.value)}
          />
          <p className="text-[10px] text-red-500 font-medium">Required before submission</p>
        </div>
      )}
    </div>
  );
}
