import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { ArrowLeft, Loader2, Save, Send, ImageIcon } from 'lucide-react';
import { purchaseRequestsApi } from '@/lib/api-services';
import { Skeleton } from '@/components/ui/skeleton';
import { StickyFooter } from '@/components/ui/sticky-footer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  Surface,
} from '@/components/premium';
import { STEP_LABELS, STEP_FIELDS } from './form/schemas';
import { useStagedFiles } from './form/use-staged-files';
import { usePrForm } from './form/use-pr-form';
import { StepBasics } from './form/step-basics';
import { StepItems } from './form/step-items';
import { StepReview } from './form/step-review';
import { GuidedStepper } from './form/guided-stepper';
import { ContextualPanel } from './form/contextual-panels';

export function PrFormPage() {
  usePageTitle('Purchase Request');
  const stagedFiles = useStagedFiles();
  const pr = usePrForm(stagedFiles);
  const { form, isEdit, id, prData, prLoading, navigate } = pr;

  const [step, setStep] = useState(0);
  const [selectedSellerIndexes, setSelectedSellerIndexes] = useState<Record<number, number>>({});
  const [serverPhotoPreviews, setServerPhotoPreviews] = useState<
    Record<string, string>
  >({});

  // Reconstruct selected seller indexes from saved draft data
  useEffect(() => {
    if (!isEdit || !prData?.data?.items) return;
    const indexes: Record<number, number> = {};
    prData.data.items.forEach((item: { estimatedPrice?: number; sellerReferences?: Array<{ price: number }> }, i: number) => {
      const price = item.estimatedPrice;
      const refs = item.sellerReferences ?? [];
      if (price && price > 0 && refs.length > 0) {
        const matchIdx = refs.findIndex((r) => r.price === price);
        if (matchIdx !== -1) indexes[i] = matchIdx;
      }
    });
    if (Object.keys(indexes).length > 0) {
      setSelectedSellerIndexes((prev) => {
        // Don't overwrite if user already made selections this session
        const merged = { ...indexes };
        for (const key of Object.keys(prev)) merged[Number(key)] = prev[Number(key)];
        return merged;
      });
    }
  }, [isEdit, prData?.data?.items]);

  useEffect(() => {
    if (!isEdit || !prData?.data?.items || !id) return;
    prData.data.items.forEach((item) => {
      if (item.referencePhotoPath && !serverPhotoPreviews[item._id]) {
        purchaseRequestsApi
          .fetchItemPhoto(id, item._id)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setServerPhotoPreviews((prev) => ({ ...prev, [item._id]: url }));
          })
          .catch(() => null);
      }
    });
  }, [isEdit, prData?.data?.items, id]);

  useEffect(() => {
    const urls = serverPhotoPreviews;
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const requestType = form.watch('requestType');
  const isJR = requestType === 'job_request';
  const typeLabel = isJR ? 'Job Request' : 'Purchase Request';

  const goToStep = (target: number) => {
    if (target < step) {
      setStep(target);
      return;
    }
    advanceToStep(target);
  };

  const advanceToStep = async (target: number) => {
    for (let s = step; s < target; s++) {
      const fieldNames = STEP_FIELDS[s as keyof typeof STEP_FIELDS] as readonly string[];
      if (fieldNames.length > 0) {
        const valid = await form.trigger(
          fieldNames as Parameters<typeof form.trigger>[0],
        );
        if (!valid) {
          setStep(s);
          return;
        }
      }
    }
    setStep(target);
  };

  const handleNext = () => advanceToStep(step + 1);
  const handleBack = () => setStep(Math.max(0, step - 1));

  const handleDraftSave = () => {
    pr.submitActionRef.current = 'draft';
    pr.saveDraft();
  };

  const handleSubmit = () => {
    pr.submitActionRef.current = 'submit';
    form.handleSubmit(pr.onSubmit, pr.onInvalid)();
  };

  if (isEdit && prLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-64" />
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;
  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <div className="flex flex-col gap-6 max-w-screen-2xl min-h-[calc(100vh-8.5rem)] lg:min-h-[calc(100vh-9.5rem)]">
      <PageHeader
        title={isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}
        description="Create a request for items, services, or project needs."
        actions={
          <GhostButton onClick={() => navigate('/purchase-requests')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <GuidedStepper
        steps={STEP_LABELS}
        currentStep={step}
        onStepClick={goToStep}
      />

      <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="flex-1 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div className="min-w-0 space-y-6">
            {step === 0 && (
              <StepBasics
                form={form}
                isEdit={isEdit}
                projectOptions={pr.projectOptions}
              />
            )}

            {step === 1 && (
              <StepItems
                form={form}
                fields={pr.fields}
                append={pr.append}
                remove={pr.remove}
                totalAmount={pr.totalAmount}
                stagedFiles={stagedFiles}
                prData={prData}
                serverPhotoPreviews={serverPhotoPreviews}
                selectedSellerIndexes={selectedSellerIndexes}
                onSelectedSellerIndexesChange={setSelectedSellerIndexes}
              />
            )}

            {step === 2 && (
              <StepReview
                form={form}
                projectOptions={pr.projectOptions}
                totalAmount={pr.totalAmount}
                stagedPhotos={stagedFiles.stagedPhotos}
                prData={prData}
                serverPhotoPreviews={serverPhotoPreviews}
                selectedSellerIndexes={selectedSellerIndexes}
                onGoToStep={goToStep}
              />
            )}
          </div>

          {/* Right rail — step-aware contextual panel */}
          <aside className="hidden xl:block">
            <div className="sticky top-6">
              <ContextualPanel
                step={step}
                form={form}
                totalAmount={pr.totalAmount}
              />
            </div>
          </aside>
        </div>
      </form>

      <StickyFooter>
          {/* Desktop layout: step label left, actions right */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 leading-none">
                Step {step + 1} of {STEP_LABELS.length}
              </p>
              <p className="mt-1.5 text-[14px] font-semibold text-zinc-900 leading-none">
                {STEP_LABELS[step]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GhostButton
                type="button"
                onClick={() => navigate('/purchase-requests')}
              >
                Cancel
              </GhostButton>
              {step > 0 && (
                <GhostButton type="button" onClick={handleBack}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </GhostButton>
              )}
              <GhostButton
                type="button"
                disabled={isSubmitting}
                onClick={handleDraftSave}
              >
                {isSubmitting && pr.submitActionRef.current === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </GhostButton>
              {isLastStep ? (
                <PrimaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting && pr.submitActionRef.current === 'submit' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit for Approval
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" onClick={handleNext}>
                  Continue
                </PrimaryButton>
              )}
            </div>
          </div>

          {/* Mobile layout: primary action full-width, secondaries above */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            <div className="flex items-center gap-2">
              <GhostButton
                type="button"
                className="flex-1"
                onClick={() => navigate('/purchase-requests')}
              >
                Cancel
              </GhostButton>
              {step > 0 && (
                <GhostButton
                  type="button"
                  className="flex-1"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </GhostButton>
              )}
              <GhostButton
                type="button"
                className="flex-1"
                disabled={isSubmitting}
                onClick={handleDraftSave}
              >
                {isSubmitting && pr.submitActionRef.current === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </GhostButton>
            </div>
            {isLastStep ? (
              <PrimaryButton
                type="button"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting && pr.submitActionRef.current === 'submit' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit for Approval
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="button"
                className="w-full"
                onClick={handleNext}
              >
                Continue
              </PrimaryButton>
            )}
          </div>
        </StickyFooter>

      {/* Server photo viewer dialog */}
      <Dialog
        open={stagedFiles.photoViewDialog.open}
        onOpenChange={(o) => {
          if (!o) stagedFiles.setPhotoViewDialog({ open: false, url: null });
        }}
      >
        <DialogContent
          className="max-w-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-48">
            {stagedFiles.photoViewDialog.url && (
              <img
                src={stagedFiles.photoViewDialog.url}
                alt="Reference photo"
                className="max-w-full max-h-[60vh] rounded-md object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
