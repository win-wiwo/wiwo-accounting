import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Trophy } from 'lucide-react';
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
    // Only mark highest if there are at least 2 priced entries and highest != cheapest
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Supplier Comparison</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quote every item per supplier. Green = lowest price. Red = highest.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddEntry}>
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[200px]">Item</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[60px]">Qty</th>
              {entries.map((entry, i) => {
                return (
                  <th key={entry.localId} className={`text-left px-3 py-2 min-w-[180px] ${entry.isSelected ? 'bg-emerald-50' : ''}`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Supplier {i + 1}</span>
                        {entry.isSelected && (
                          <Badge variant="success" className="text-[9px] px-1 py-0">
                            <Trophy className="h-2.5 w-2.5 mr-0.5" /> Winner
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={entry.supplierId || 'none'}
                        onValueChange={(v) => onUpdateEntry(entry.localId, { supplierId: v === 'none' ? '' : v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                            className="h-6 w-6 text-destructive hover:text-destructive"
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
              <tr key={item._id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-xs">{item.description}</p>
                  {item.specifications && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.specifications}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
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
                      className={`px-3 py-2 ${entry.isSelected ? 'bg-emerald-50/50' : ''} ${isCheapest ? 'bg-emerald-50' : ''} ${isHighest ? 'bg-red-50/40' : ''}`}
                    >
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">P</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            className="h-8 text-xs pl-6"
                            value={entry.quotedPrices[item._id] ?? ''}
                            onChange={(e) => onUpdateEntry(entry.localId, {
                              quotedPrices: { ...entry.quotedPrices, [item._id]: e.target.value },
                            })}
                          />
                        </div>
                        {price > 0 && (
                          <p className={`text-[10px] ${isCheapest ? 'text-emerald-700 font-semibold' : isHighest ? 'text-red-500' : 'text-muted-foreground'}`}>
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
            <tr className="border-t-2 bg-muted/20">
              <td className="px-3 py-2 font-semibold text-xs" colSpan={2}>Total</td>
              {entries.map((entry, i) => {
                const total = totals[i];
                const supplier = suppliers.find((s) => s._id === entry.supplierId);
                return (
                  <td key={entry.localId} className={`px-3 py-2 ${entry.isSelected ? 'bg-emerald-50/50' : ''}`}>
                    <p className="text-sm font-bold">{total > 0 ? formatCurrency(total) : '—'}</p>
                    {supplier && <p className="text-[10px] text-muted-foreground">{supplier.companyName}</p>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Savings indicator */}
      {savings > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Trophy className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold text-emerald-700">{formatCurrency(savings)}</span>
            <span className="text-muted-foreground"> savings vs next best quote</span>
          </p>
        </div>
      )}

      {/* Per-supplier remarks */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, i) => {
          const supplier = suppliers.find((s) => s._id === entry.supplierId);
          return (
            <div key={entry.localId} className="space-y-1">
              <Label className="text-xs">
                {supplier?.companyName || `Supplier ${i + 1}`} — Terms / Notes
              </Label>
              <textarea
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Lead time, warranty, payment terms..."
                value={entry.remarks}
                onChange={(e) => onUpdateEntry(entry.localId, { remarks: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      {/* Justification for fewer than 3 */}
      {entries.length < 3 && (
        <div className="space-y-1">
          <Label className="text-xs">
            Justification for Fewer than 3 Suppliers <span className="text-destructive">*</span>
          </Label>
          <textarea
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Explain why only one or two suppliers could be canvassed."
            value={canvassJustification}
            onChange={(e) => onJustificationChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
