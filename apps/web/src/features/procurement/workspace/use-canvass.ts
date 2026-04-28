import { useState, useCallback } from 'react';
import type { SubmitQuotationDto } from '@prams/shared';
import { useSubmitQuotation, useReturnForInfo } from '@/hooks/use-purchase-requests';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useToast } from '@/components/ui/toast';
import { getErrorMessage } from './utils';

export interface DraftCanvassEntry {
  localId: string;
  supplierId: string;
  remarks: string;
  isSelected: boolean;
  quotedPrices: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrItem = any;

export function useCanvass(prId: string | undefined, procItems: PrItem[], onComplete: () => void) {
  const { toast } = useToast();
  const submitQuotation = useSubmitQuotation();
  const returnMutation = useReturnForInfo();
  const { data: suppliersData } = useSuppliers({ limit: 100, status: 'active' });
  const suppliers = suppliersData?.data ?? [];

  const [actionStep, setActionStep] = useState<'quotation' | 'return' | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [canvassEntries, setCanvassEntries] = useState<DraftCanvassEntry[]>([]);
  const [canvassJustification, setCanvassJustification] = useState('');

  const buildEmptyEntry = useCallback((index: number): DraftCanvassEntry => ({
    localId: `new-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    supplierId: '',
    remarks: '',
    isSelected: index === 0,
    quotedPrices: Object.fromEntries(procItems.map((item: PrItem) => [item._id, ''])),
  }), [procItems]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startQuotation = useCallback((pr: any) => {
    const existing = (pr?.canvassEntries ?? []).map((entry: { _id?: string; supplierId: string | { _id: string }; remarks?: string; isSelected: boolean; quotedItems: Array<{ itemId: string; unitPrice: number }> }, index: number) => ({
      localId: entry._id ?? `existing-${index}`,
      supplierId: typeof entry.supplierId === 'string' ? entry.supplierId : entry.supplierId._id,
      remarks: entry.remarks ?? '',
      isSelected: entry.isSelected,
      quotedPrices: Object.fromEntries(
        procItems.map((item: PrItem) => {
          const quotedItem = entry.quotedItems.find((candidate) => candidate.itemId === item._id);
          return [item._id, quotedItem ? String(quotedItem.unitPrice) : ''];
        }),
      ),
    }));
    const initialEntries = existing.length > 0
      ? existing
      : Array.from({ length: 3 }, (_, index) => buildEmptyEntry(index));
    const hasSelected = initialEntries.some((entry: DraftCanvassEntry) => entry.isSelected);
    setCanvassEntries(
      initialEntries.map((entry: DraftCanvassEntry, index: number) => ({
        ...entry,
        isSelected: hasSelected ? entry.isSelected : index === 0,
      })),
    );
    setCanvassJustification(pr?.canvassJustification ?? '');
    setActionStep('quotation');
  }, [procItems, buildEmptyEntry]);

  const addEntry = () => {
    setCanvassEntries((current) => [...current, buildEmptyEntry(current.length)]);
  };

  const removeEntry = (localId: string) => {
    setCanvassEntries((current) => {
      if (current.length === 1) return current;
      const next = current.filter((e) => e.localId !== localId);
      if (!next.some((e) => e.isSelected) && next[0]) {
        next[0] = { ...next[0], isSelected: true };
      }
      return next;
    });
  };

  const updateEntry = (localId: string, patch: Partial<DraftCanvassEntry>) => {
    setCanvassEntries((current) => current.map((e) => (e.localId === localId ? { ...e, ...patch } : e)));
  };

  const setWinner = (localId: string) => {
    setCanvassEntries((current) => current.map((e) => ({ ...e, isSelected: e.localId === localId })));
  };

  const handleSubmitQuotation = async (quotationAttachmentsCount: number) => {
    if (canvassEntries.length === 0) {
      toast({ title: 'Canvass entries required', description: 'Add at least one supplier canvass entry.', variant: 'error' });
      return;
    }
    const selectedCount = canvassEntries.filter((e) => e.isSelected).length;
    if (selectedCount !== 1) {
      toast({ title: 'Winning supplier required', description: 'Select exactly one winning supplier.', variant: 'error' });
      return;
    }
    const selectedSuppliers = canvassEntries.map((e) => e.supplierId).filter(Boolean);
    if (selectedSuppliers.length !== canvassEntries.length) {
      toast({ title: 'Supplier required', description: 'Select a supplier for every canvass entry.', variant: 'error' });
      return;
    }
    if (new Set(selectedSuppliers).size !== selectedSuppliers.length) {
      toast({ title: 'Duplicate suppliers', description: 'Each canvass entry must use a different supplier.', variant: 'error' });
      return;
    }
    const trimmedJustification = canvassJustification.trim();
    if (canvassEntries.length < 3 && !trimmedJustification) {
      toast({ title: 'Justification required', description: 'Explain why fewer than 3 suppliers were canvassed.', variant: 'error' });
      return;
    }
    if (quotationAttachmentsCount === 0) {
      toast({ title: 'Quotation evidence required', description: 'Upload at least one canvass or supplier quotation before submitting.', variant: 'error' });
      return;
    }

    const payloadEntries: SubmitQuotationDto['canvassEntries'] = [];
    for (const entry of canvassEntries) {
      const supplier = suppliers.find((s: { _id: string; companyName: string }) => s._id === entry.supplierId);
      if (!supplier) {
        toast({ title: 'Invalid supplier', description: 'One of the selected suppliers is no longer available.', variant: 'error' });
        return;
      }
      const quotedItems = [];
      let hasInvalidPrice = false;
      for (const item of procItems) {
        const unitPrice = Number(entry.quotedPrices[item._id]);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          hasInvalidPrice = true;
          break;
        }
        quotedItems.push({
          itemId: item._id,
          description: item.description,
          unitPrice,
          totalPrice: item.quantity * unitPrice,
          remarks: undefined,
        });
      }
      if (hasInvalidPrice) {
        toast({ title: 'All prices required', description: `Enter a valid quoted price for every item under ${supplier.companyName}.`, variant: 'error' });
        return;
      }
      payloadEntries.push({
        supplierId: supplier._id,
        supplierName: supplier.companyName,
        quotedItems,
        totalQuotedAmount: quotedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        remarks: entry.remarks.trim() || undefined,
        isSelected: entry.isSelected,
      });
    }

    try {
      await submitQuotation.mutateAsync({
        id: prId!,
        payload: { canvassEntries: payloadEntries, canvassJustification: trimmedJustification || undefined },
      });
      toast({ title: 'Quotation submitted', description: 'PR has been forwarded for approval.', variant: 'success' });
      onComplete();
    } catch (error) {
      toast({ title: 'Failed to submit quotation', description: getErrorMessage(error, 'Check supplier selection, prices, and quotation evidence, then try again.'), variant: 'error' });
    }
  };

  const handleReturnForInfo = async () => {
    if (!returnNote.trim()) {
      toast({ title: 'Note required', description: 'Explain what additional info is needed.', variant: 'error' });
      return;
    }
    try {
      await returnMutation.mutateAsync({ id: prId!, note: returnNote.trim() });
      toast({ title: 'Clarification requested', description: 'Requester has been notified. PR remains in your queue.', variant: 'success' });
      onComplete();
    } catch (error) {
      toast({ title: 'Action failed', description: getErrorMessage(error, 'The request could not be returned for more information.'), variant: 'error' });
    }
  };

  const resetActions = () => {
    setActionStep(null);
    setReturnNote('');
    setCanvassEntries([]);
    setCanvassJustification('');
  };

  return {
    suppliers,
    actionStep,
    setActionStep,
    returnNote,
    setReturnNote,
    canvassEntries,
    canvassJustification,
    setCanvassJustification,
    startQuotation,
    addEntry,
    removeEntry,
    updateEntry,
    setWinner,
    handleSubmitQuotation,
    handleReturnForInfo,
    resetActions,
    isSubmitting: submitQuotation.isPending,
    isReturning: returnMutation.isPending,
  };
}
