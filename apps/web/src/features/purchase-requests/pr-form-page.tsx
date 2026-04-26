import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Save, Send, ImageIcon } from 'lucide-react';
import { purchaseRequestsApi } from '@/lib/api-services';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Stepper } from '@/components/ui/stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STEP_LABELS, STEP_FIELDS } from './form/schemas';
import { useStagedFiles } from './form/use-staged-files';
import { usePrForm } from './form/use-pr-form';
import { StepBasics } from './form/step-basics';
import { StepItems } from './form/step-items';
import { StepReview } from './form/step-review';
import { HowItWorks } from './form/how-it-works';

export function PrFormPage() {
  const stagedFiles = useStagedFiles();
  const pr = usePrForm(stagedFiles);
  const { form, isEdit, id, prData, prLoading, navigate } = pr;

  const [step, setStep] = useState(0);

  // Server photo previews (edit mode)
  const [serverPhotoPreviews, setServerPhotoPreviews] = useState<Record<string, string>>({});

  // Load server photo thumbnails for existing items
  useEffect(() => {
    if (!isEdit || !prData?.data?.items || !id) return;
    prData.data.items.forEach((item) => {
      if (item.referencePhotoPath && !serverPhotoPreviews[item._id]) {
        purchaseRequestsApi.fetchItemPhoto(id, item._id)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setServerPhotoPreviews((prev) => ({ ...prev, [item._id]: url }));
          })
          .catch(() => null);
      }
    });
  }, [isEdit, prData?.data?.items, id]);

  // Cleanup server photo URLs
  useEffect(() => {
    const urls = serverPhotoPreviews;
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const requestType = form.watch('requestType');
  const isJR = requestType === 'job_request';
  const typeLabel = isJR ? 'Job Request' : 'Purchase Request';

  // ─── Step navigation ──────────────────────────────────────────────────────

  const goToStep = (target: number) => {
    if (target < step) {
      setStep(target);
      return;
    }
    // Validate before advancing
    advanceToStep(target);
  };

  const advanceToStep = async (target: number) => {
    // Validate all steps between current and target
    for (let s = step; s < target; s++) {
      const fieldNames = STEP_FIELDS[s as keyof typeof STEP_FIELDS] as readonly string[];
      if (fieldNames.length > 0) {
        const valid = await form.trigger(fieldNames as Parameters<typeof form.trigger>[0]);
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

  // ─── Draft save (any step, skips validation) ──────────────────────────────

  const handleDraftSave = () => {
    pr.submitActionRef.current = 'draft';
    form.handleSubmit(pr.onSubmit, pr.onInvalid)();
  };

  // ─── Submit (step 4 only) ────────────────────────────────────────────────

  const handleSubmit = () => {
    pr.submitActionRef.current = 'submit';
    form.handleSubmit(pr.onSubmit, pr.onInvalid)();
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isEdit && prLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;
  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}>
        <Button variant="outline" onClick={() => navigate('/purchase-requests')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <HowItWorks />

      <Stepper
        steps={STEP_LABELS}
        currentStep={step}
        onStepClick={goToStep}
      />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {step === 0 && (
          <StepBasics form={form} isEdit={isEdit} projectOptions={pr.projectOptions} />
        )}

        {step === 1 && (
          <StepItems
            form={form}
            fields={pr.fields}
            append={pr.append}
            remove={pr.remove}
            totalAmount={pr.totalAmount}
            hasProcurementItems={pr.hasProcurementItems}
            stagedFiles={stagedFiles}
            prData={prData}
            serverPhotoPreviews={serverPhotoPreviews}
          />
        )}

        {step === 2 && (
          <StepReview
            form={form}
            projectOptions={pr.projectOptions}
            totalAmount={pr.totalAmount}
            hasProcurementItems={pr.hasProcurementItems}
            stagedPhotosCount={Object.keys(stagedFiles.stagedPhotos).length}
            onGoToStep={goToStep}
          />
        )}

        {/* Sticky footer with navigation */}
        <StickyFooter>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/purchase-requests')}>
                Cancel
              </Button>
              {step > 0 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {/* Draft save available from any step */}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleDraftSave}
              >
                {isSubmitting && pr.submitActionRef.current === 'draft'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />}
                Save Draft
              </Button>

              {isLastStep ? (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting && pr.submitActionRef.current === 'submit'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  Submit for Approval
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </StickyFooter>
      </form>

      {/* Server photo viewer dialog */}
      <Dialog
        open={stagedFiles.photoViewDialog.open}
        onOpenChange={(o) => { if (!o) stagedFiles.setPhotoViewDialog({ open: false, url: null }); }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-48">
            {stagedFiles.photoViewDialog.url && (
              <img src={stagedFiles.photoViewDialog.url} alt="Reference photo" className="max-w-full max-h-[60vh] rounded-md object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
